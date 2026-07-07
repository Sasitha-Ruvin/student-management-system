import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { uploadReceiptFromFile } from "@/lib/storage/receipt";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/students/[id]/enrollment-receipt
// multipart/form-data: enrollmentId (string) + receipt (File)
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const enrollmentId = formData.get("enrollmentId");
  if (!enrollmentId || typeof enrollmentId !== "string") {
    return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
  }

  const receiptFile = formData.get("receipt");
  if (!(receiptFile instanceof File) || receiptFile.size === 0) {
    return NextResponse.json({ error: "receipt file is required" }, { status: 400 });
  }

  // Verify this enrollment belongs to the given student
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, studentId },
    select: { id: true },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found for this student" },
      { status: 404 },
    );
  }

  let receiptUrl: string;
  try {
    receiptUrl = await uploadReceiptFromFile(receiptFile, enrollmentId);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 },
    );
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { regFeeReceiptUrl: receiptUrl },
  });

  return NextResponse.json({ data: { receiptUrl } }, { status: 200 });
}
