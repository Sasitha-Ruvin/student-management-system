import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { voidPayment, VoidPaymentError } from "@/lib/payments/void-payment";
import type { VoidPaymentRequest } from "@/types/api/payment";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/[id]/void
 *
 * Soft-voids a payment, replays installment balances, and returns re-record hints.
 */
export async function POST(request: Request, context: RouteContext) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;

  let body: VoidPaymentRequest;
  try {
    body = (await request.json()) as VoidPaymentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reason || typeof body.reason !== "string") {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  let result;
  try {
    result = await voidPayment(paymentId, admin.id, body.reason);
  } catch (err) {
    if (err instanceof VoidPaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to void payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      installment: {
        select: {
          enrollment: {
            select: {
              batchId: true,
              batch: { select: { branchId: true } },
            },
          },
        },
      },
      student: { select: { preferredBranchId: true } },
    },
  });

  invalidateOperationalData({
    batchId: payment?.installment?.enrollment?.batchId ?? undefined,
    branchId:
      payment?.installment?.enrollment?.batch?.branchId ??
      payment?.student?.preferredBranchId ??
      undefined,
  });

  return NextResponse.json({
    data: result,
    message: "Payment voided. You can record the correct payment now.",
  });
}
