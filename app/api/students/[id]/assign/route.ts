import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import {
  assignStudentToBatch,
  AssignmentError,
} from "@/lib/students/student-assignment";
import type { AssignBatchBody } from "@/types/api/student";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/students/[id]/assign
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, ...STUDENT_PII_SELECT },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  let body: AssignBatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.batchId) {
    return NextResponse.json({ error: "batchId is required" }, { status: 400 });
  }

  if (!body.paymentPath || !["INSTALLMENT", "ONE_TIME"].includes(body.paymentPath)) {
    return NextResponse.json(
      { error: "paymentPath must be INSTALLMENT or ONE_TIME" },
      { status: 400 },
    );
  }

  const batch = await prisma.batch.findUnique({
    where: { id: body.batchId },
    select: { branchId: true },
  });

  try {
    const result = await assignStudentToBatch(id, body);
    invalidateOperationalData({
      batchId: body.batchId,
      branchId: batch?.branchId,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof AssignmentError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    throw err;
  }
}
