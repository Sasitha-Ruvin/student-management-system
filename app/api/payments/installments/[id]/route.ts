import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import {
  updateInstallment,
  UpdateInstallmentError,
} from "@/lib/payments/update-installment";
import { prisma } from "@/lib/prisma";
import type { UpdateInstallmentBody } from "@/types/api/payment";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/payments/installments/[id] — Edit due date, amount, or label
export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: UpdateInstallmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const installment = await prisma.installment.findUnique({
    where: { id },
    select: {
      enrollment: {
        select: { batchId: true, batch: { select: { branchId: true } } },
      },
    },
  });

  if (!installment) {
    return NextResponse.json({ error: "Instalment not found" }, { status: 404 });
  }

  try {
    const data = await updateInstallment(id, {
      dueDate: body.dueDate,
      amount: body.amount,
      label: body.label,
      overdueAsOf:
        body.overdueAsOf === "today" ? "today" : "payment_date",
    });

    invalidateOperationalData({
      batchId: installment.enrollment.batchId ?? undefined,
      branchId: installment.enrollment.batch?.branchId ?? undefined,
    });

    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof UpdateInstallmentError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
