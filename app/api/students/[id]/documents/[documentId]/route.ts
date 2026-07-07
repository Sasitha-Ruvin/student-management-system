import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { downloadStudentDocument } from "@/lib/storage/student-documents";

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

/** GET /api/students/[id]/documents/[documentId] */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId, documentId } = await context.params;

  const doc = await prisma.studentDocument.findFirst({
    where: { id: documentId, studentId },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const downloaded = await downloadStudentDocument(doc.storagePath);
  if (!downloaded) {
    return NextResponse.json({ error: "Document not found in storage" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(downloaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": downloaded.mimeType,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
