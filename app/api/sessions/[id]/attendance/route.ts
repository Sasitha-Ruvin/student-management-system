import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { toAttendanceStatusValue } from "@/lib/batches/batch-mappers";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import type { MarkAttendanceBody, SessionAttendanceRow } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/sessions/[id]/attendance
// Admin upserts attendance for any student — including cross-branch guests.
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: sessionId } = await context.params;

  let body: MarkAttendanceBody;
  try {
    body = (await request.json()) as MarkAttendanceBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;
  if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "status must be PRESENT, ABSENT, or LATE" },
      { status: 400 },
    );
  }

  // Verify session exists and is not CANCELLED
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      sessionNumber: true,
      status: true,
      branchId: true,
      batchId: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot record attendance for a cancelled session" },
      { status: 422 },
    );
  }

  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: body.studentId },
    select: {
      id: true,
      modelCode: true,
      photoUrl: true,
      ...STUDENT_PII_SELECT,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { batch: { select: { branchId: true } } },
        take: 1,
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Upsert attendance record (admin can mark any student — no enrollment check)
  const record = await prisma.attendance.upsert({
    where: {
      studentId_sessionId: {
        studentId: body.studentId,
        sessionId,
      },
    },
    create: {
      studentId: body.studentId,
      sessionId,
      attendanceStatus: body.status,
      source: "ADMIN",
      notes: body.notes ?? null,
      markedAt: new Date(),
    },
    update: {
      attendanceStatus: body.status,
      source: "ADMIN",
      notes: body.notes ?? null,
      markedAt: new Date(),
    },
  });

  const studentActiveBranchId = student.enrollments[0]?.batch?.branchId ?? null;
  const isCrossBranch =
    studentActiveBranchId !== null &&
    studentActiveBranchId !== session.branchId;

  const row: SessionAttendanceRow = {
    attendanceId: record.id,
    studentId: student.id,
    fullName: student.fullName,
    modelCode: student.modelCode,
    photoUrl: student.photoUrl,
    status: toAttendanceStatusValue(record.attendanceStatus) as SessionAttendanceRow["status"],
    source: record.source as "ADMIN" | "STUDENT",
    markedAt: record.markedAt.toISOString(),
    notes: record.notes,
    isCrossBranch,
  };

  invalidateOperationalData({
    batchId: session.batchId,
    branchId: session.branchId,
  });

  return NextResponse.json({ data: row }, { status: 201 });
}
