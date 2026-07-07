import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { getInstallmentsByStudent } from "@/lib/payments/payment-queries";
import { syncOverdueInstallments } from "@/lib/payments/sync-overdue-installments";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/students/[id]/installments
 *
 * All instalment rows for active enrollments of this student.
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

  await syncOverdueInstallments();
  const data = await getInstallmentsByStudent(studentId);

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
