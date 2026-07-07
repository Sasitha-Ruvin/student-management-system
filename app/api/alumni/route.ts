import { NextResponse } from "next/server";

import { fetchAlumniById } from "@/lib/alumni/alumni-queries";
import { getCachedAlumniListPage } from "@/lib/api/cached-queries";
import {
  buildLegacyAlumniNotes,
  getOrCreateLegacyAlumniBatch,
} from "@/lib/alumni/legacy-alumni-batch";
import { parsePageLimit } from "@/lib/api/parse-list-params";
import { freshAdminJson } from "@/lib/api/cache-headers";
import { promoteToAlumni } from "@/lib/alumni/promote-to-alumni";
import {
  invalidateAlumni,
  invalidateOperationalData,
  invalidateStudents,
} from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { isoToDate } from "@/lib/batches/session-generator";
import { prisma } from "@/lib/prisma";
import { generateModelCode } from "@/lib/students/model-code-generator";
import {
  emailDuplicateWhere,
  encryptStudentPiiForWrite,
  nicDuplicateWhere,
  syncStudentSearchTokens,
} from "@/lib/students/student-pii";
import type { AddAlumniBody } from "@/types/api/alumni";

function parseGraduatedAt(value: string): Date | null {
  const d = isoToDate(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const batchId = searchParams.get("batchId");
  const search = searchParams.get("search");

  const { page, limit } = parsePageLimit(searchParams);
  const data = await getCachedAlumniListPage({
    branchId,
    batchId,
    search,
    page,
    limit,
  });

  return freshAdminJson({ data });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: AddAlumniBody;
  try {
    body = (await request.json()) as AddAlumniBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const graduatedAt = parseGraduatedAt(body.graduatedAt);
  if (!graduatedAt) {
    return NextResponse.json({ error: "Invalid graduatedAt" }, { status: 400 });
  }

  if (body.mode === "existing") {
    if (!body.batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: body.batchId },
      select: { id: true, branchId: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    if (!body.studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: body.studentId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const existingAlumni = await prisma.alumni.findUnique({
      where: { studentId: body.studentId },
    });

    if (existingAlumni) {
      return NextResponse.json(
        {
          error:
            "This student is already in the alumni list. Use batch graduation to update their intake, or view their record in Alumni Management.",
        },
        { status: 409 },
      );
    }

    let enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_batchId: {
          studentId: body.studentId,
          batchId: body.batchId,
        },
      },
    });

    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          studentId: body.studentId,
          batchId: body.batchId,
          status: "ACTIVE",
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      return promoteToAlumni(
        {
          studentId: body.studentId,
          batchId: body.batchId,
          graduatedAt,
          notes: body.notes ?? null,
        },
        tx,
      );
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Student enrollment cannot be promoted (suspended, on hold, dropped, or unassigned).",
        },
        { status: 422 },
      );
    }

    invalidateAlumni();
    invalidateStudents();
    invalidateOperationalData({ branchId: batch.branchId, batchId: batch.id });

    const item = await fetchAlumniById(result.alumniId);
    if (!item) {
      return NextResponse.json(
        { error: "Alumni created but could not load response" },
        { status: 500 },
      );
    }
    return freshAdminJson({ data: item }, 201);
  }

  if (body.mode === "new") {
    const { fullName, email, nic, contactNumber, notes, branchId, graduatedIntake } =
      body;

    if (!fullName?.trim()) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    if (!nic?.trim()) {
      return NextResponse.json({ error: "nic is required" }, { status: 400 });
    }
    if (!branchId?.trim()) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId.trim() },
      select: { id: true },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const phone = (contactNumber?.trim() || "0700000000").replace(/\s/g, "");
    const alumniNotes = buildLegacyAlumniNotes(graduatedIntake, notes);
    const normalizedNic = nic.trim().toUpperCase();
    const duplicate = await prisma.student.findFirst({
      where: {
        OR: [
          emailDuplicateWhere(email.trim()),
          nicDuplicateWhere(normalizedNic),
        ],
      },
      select: { id: true, email: true, nicHash: true },
    });

    if (duplicate) {
      const field =
        duplicate.email?.toLowerCase() === email.trim().toLowerCase()
          ? "email"
          : "nic";
      return NextResponse.json(
        { error: `A student with this ${field} already exists` },
        { status: 409 },
      );
    }

    const defaultDob = new Date("1990-01-01");
    const modelCode = await generateModelCode(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const legacyBatch = await getOrCreateLegacyAlumniBatch(tx, branch.id);

      const piiWrite = encryptStudentPiiForWrite({
        email: email.trim(),
        fullName: fullName.trim(),
        gender: "Other",
        nic: normalizedNic,
        dob: defaultDob,
        address: "Not provided",
        contactNumber: phone,
        whatsappNumber: phone,
      });

      const student = await tx.student.create({
        data: {
          fullName: piiWrite.fullName as string,
          email: piiWrite.email as string,
          gender: piiWrite.gender as string,
          nicEnc: piiWrite.nicEnc as string,
          nicHash: piiWrite.nicHash as string,
          dobEnc: piiWrite.dobEnc as string,
          addressEnc: piiWrite.addressEnc as string,
          contactNumberEnc: piiWrite.contactNumberEnc as string,
          whatsappNumberEnc: piiWrite.whatsappNumberEnc as string,
          heightEnc: (piiWrite.heightEnc ?? null) as string | null,
          weightEnc: (piiWrite.weightEnc ?? null) as string | null,
          loginDisabledNote: (piiWrite.loginDisabledNote ?? null) as string | null,
          preferredBranchRaw: (piiWrite.preferredBranchRaw ?? null) as string | null,
          preferredDate: (piiWrite.preferredDate ?? null) as string | null,
          fcmToken: (piiWrite.fcmToken ?? null) as string | null,
          modelCode,
          source: "MANUAL",
          age: 25,
          preferredBranchId: branch.id,
        },
      });

      await syncStudentSearchTokens(
        tx,
        student.id,
        fullName.trim(),
        normalizedNic,
      );

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          batchId: legacyBatch.id,
          status: "ACTIVE",
        },
      });

      const promoted = await promoteToAlumni(
        {
          studentId: student.id,
          batchId: legacyBatch.id,
          graduatedAt,
          notes: alumniNotes,
        },
        tx,
      );

      if (!promoted) {
        throw new Error("Failed to create alumni record");
      }

      return { promoted, legacyBatchId: legacyBatch.id };
    });

    invalidateAlumni();
    invalidateStudents();
    invalidateOperationalData({
      branchId: branch.id,
      batchId: result.legacyBatchId,
    });

    const item = await fetchAlumniById(result.promoted.alumniId);
    if (!item) {
      return NextResponse.json(
        { error: "Alumni created but could not load response" },
        { status: 500 },
      );
    }
    return freshAdminJson({ data: item }, 201);
  }

  return NextResponse.json(
    { error: 'mode must be "existing" or "new"' },
    { status: 400 },
  );
}
