import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { toStudentDocumentDto } from "@/lib/students/student-document-mappers";
import {
  uploadStudentDocument,
  validateStudentDocumentFile,
} from "@/lib/storage/student-documents";
import { syncStudentDocumentsFromStorage } from "@/lib/storage/sync-student-documents";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/students/[id]/documents */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, photoUrl: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await syncStudentDocumentsFromStorage(studentId, student.photoUrl);

  const docs = await prisma.studentDocument.findMany({
    where: { studentId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({
    data: docs.map((doc) => toStudentDocumentDto(studentId, doc)),
  });
}

/** POST /api/students/[id]/documents — partial upload (NIC and/or professional photos) */
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const nicFront = formData.get("nicFront");
  const nicBack = formData.get("nicBack");
  const professionalPhotos = formData
    .getAll("professionalPhotos")
    .filter((f): f is File => f instanceof File);

  const hasNicFront = nicFront instanceof File;
  const hasNicBack = nicBack instanceof File;
  const hasProfessional = professionalPhotos.length > 0;

  if (!hasNicFront && !hasNicBack && !hasProfessional) {
    return NextResponse.json(
      { error: "At least one document file is required" },
      { status: 400 },
    );
  }

  try {
    if (hasNicFront) validateStudentDocumentFile(nicFront);
    if (hasNicBack) validateStudentDocumentFile(nicBack);
    professionalPhotos.forEach(validateStudentDocumentFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid file";
    const status =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const existingProCount = hasProfessional
    ? await prisma.studentDocument.count({
        where: { studentId, type: "PROFESSIONAL_PHOTO" },
      })
    : 0;

  if (hasProfessional && existingProCount + professionalPhotos.length > 5) {
    return NextResponse.json(
      {
        error: `Cannot exceed 5 professional photos (${existingProCount} already on file)`,
      },
      { status: 400 },
    );
  }

  const createdIds: string[] = [];

  if (hasNicFront) {
    await prisma.studentDocument.deleteMany({
      where: { studentId, type: "NIC_FRONT" },
    });
    const upload = await uploadStudentDocument(studentId, "nic-front", nicFront);
    const doc = await prisma.studentDocument.create({
      data: {
        studentId,
        type: "NIC_FRONT",
        storagePath: upload.storagePath,
        mimeType: upload.mimeType,
        sortOrder: 0,
      },
    });
    createdIds.push(doc.id);
  }

  if (hasNicBack) {
    await prisma.studentDocument.deleteMany({
      where: { studentId, type: "NIC_BACK" },
    });
    const upload = await uploadStudentDocument(studentId, "nic-back", nicBack);
    const doc = await prisma.studentDocument.create({
      data: {
        studentId,
        type: "NIC_BACK",
        storagePath: upload.storagePath,
        mimeType: upload.mimeType,
        sortOrder: 0,
      },
    });
    createdIds.push(doc.id);
  }

  if (hasProfessional) {
    const maxSort = await prisma.studentDocument.aggregate({
      where: { studentId, type: "PROFESSIONAL_PHOTO" },
      _max: { sortOrder: true },
    });
    let nextSort = maxSort._max.sortOrder ?? 0;

    for (const file of professionalPhotos) {
      nextSort += 1;
      const upload = await uploadStudentDocument(
        studentId,
        "professional",
        file,
        nextSort,
      );
      const doc = await prisma.studentDocument.create({
        data: {
          studentId,
          type: "PROFESSIONAL_PHOTO",
          storagePath: upload.storagePath,
          mimeType: upload.mimeType,
          sortOrder: nextSort,
        },
      });
      createdIds.push(doc.id);
    }
  }

  const allDocs = await prisma.studentDocument.findMany({
    where: { studentId },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(
    {
      data: allDocs.map((doc) => toStudentDocumentDto(studentId, doc)),
      uploadedIds: createdIds,
    },
    { status: 201 },
  );
}
