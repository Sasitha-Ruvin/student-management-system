import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { findRegistrationPaymentForEnrollment } from "@/lib/payments/payment-queries";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/students/[id]/registration-payment?enrollmentId=
 */
export async function GET(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;
  const enrollmentId = new URL(request.url).searchParams.get("enrollmentId");

  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId query parameter is required" },
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

  const payment = await findRegistrationPaymentForEnrollment(
    studentId,
    enrollmentId,
  );

  return NextResponse.json({ data: payment });
}
