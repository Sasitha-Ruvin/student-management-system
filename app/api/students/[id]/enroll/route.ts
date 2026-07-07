import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import {
  createBatchEnrollment,
  EnrollmentLifecycleError,
} from "@/lib/students/enrollment-lifecycle";
import type { EnrollBatchBody } from "@/types/api/student";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;

  let body: EnrollBatchBody;
  try {
    body = (await request.json()) as EnrollBatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.batchId || !body.paymentPath) {
    return NextResponse.json(
      { error: "batchId and paymentPath are required" },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const result = await createBatchEnrollment(studentId, body);

    const batch = await prisma.batch.findUnique({
      where: { id: body.batchId },
      select: { branchId: true },
    });

    invalidateOperationalData({
      batchId: body.batchId,
      branchId: batch?.branchId,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    if (e instanceof EnrollmentLifecycleError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
