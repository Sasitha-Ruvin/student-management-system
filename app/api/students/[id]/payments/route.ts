import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { getPaymentsByStudent } from "@/lib/payments/payment-queries";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/students/[id]/payments
 *
 * Returns the full payment history for a student, sorted newest-first.
 * Also includes the total amount paid across all payments.
 */
export async function GET(_request: Request, context: RouteContext) {
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

  const items = await getPaymentsByStudent(studentId);
  const totalPaid = items
    .filter((p) => !p.voidedAt)
    .reduce((sum, p) => sum + p.amount, 0);

  return NextResponse.json(
    { data: { items, totalPaid } },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
