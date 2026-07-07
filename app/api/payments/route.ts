import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { notifyPaymentReceipts } from "@/lib/payments/notify-payment-receipts";
import { recordPayment } from "@/lib/payments/record-payment";
import { PaymentCascadeError } from "@/lib/payments/record-payment-cascade";
import { syncOverdueInstallments } from "@/lib/payments/sync-overdue-installments";
import { prisma } from "@/lib/prisma";
import type { RecordPaymentRequest } from "@/types/api/payment";

const VALID_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"] as const;

/**
 * POST /api/payments
 *
 * Records a payment against an installment; surplus cascades to later instalments.
 * Sends receipt email for the primary (first) slice by default.
 */
export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  let body: RecordPaymentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (!body.studentId || typeof body.studentId !== "string") {
    errors.studentId = "studentId is required";
  }
  if (!body.installmentId || typeof body.installmentId !== "string") {
    errors.installmentId = "installmentId is required";
  }

  const amount = Number(body.amount);
  if (!body.amount || isNaN(amount)) {
    errors.amount = "amount is required";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!body.paymentDate) {
    errors.paymentDate = "paymentDate is required";
  } else {
    const d = new Date(body.paymentDate);
    if (isNaN(d.getTime())) {
      errors.paymentDate = "paymentDate must be a valid date";
    }
  }

  if (!body.method) {
    errors.method = "method is required";
  } else if (!VALID_METHODS.includes(body.method as (typeof VALID_METHODS)[number])) {
    errors.method = `method must be one of: ${VALID_METHODS.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  const installmentContext = await prisma.installment.findUnique({
    where: { id: body.installmentId },
    select: {
      enrollment: {
        select: {
          batchId: true,
          batch: { select: { branchId: true } },
        },
      },
    },
  });

  if (!installmentContext) {
    return NextResponse.json({ error: "Installment not found" }, { status: 404 });
  }

  await syncOverdueInstallments();

  let result;
  try {
    result = await recordPayment(
      {
        studentId: body.studentId,
        installmentId: body.installmentId,
        amount,
        paymentDate: body.paymentDate,
        method: body.method,
        reference: body.reference ?? null,
        notes: body.notes ?? null,
        sendEmail: body.sendEmail !== false,
        sendSms: body.sendSms === true,
        waiveOverdueCharge: body.waiveOverdueCharge ?? false,
      },
      admin.id,
    );
  } catch (err) {
    if (err instanceof PaymentCascadeError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  invalidateOperationalData({
    batchId: installmentContext.enrollment.batchId ?? undefined,
    branchId: installmentContext.enrollment.batch?.branchId ?? undefined,
  });

  const sendEmail = body.sendEmail !== false;
  const sendSms = body.sendSms === true;
  const receiptWarnings: string[] = [];

  if (sendEmail || sendSms) {
    try {
      receiptWarnings.push(
        ...(await notifyPaymentReceipts({
          paymentIds: result.payments.map((p) => p.paymentId),
          sendEmail,
          sendSms,
        })),
      );
    } catch (notifyErr) {
      console.warn("[payments] Receipt delivery failed:", notifyErr);
      receiptWarnings.push(
        notifyErr instanceof Error ? notifyErr.message : "Receipt delivery failed",
      );
    }
  }

  const cascadeWarning =
    result.applied.length > 1
      ? `Payment applied across ${result.applied.length} instalments: ${result.applied
          .map((a) => `${a.label} (${a.amount})`)
          .join(", ")}`
      : undefined;

  const deliveryWarning =
    receiptWarnings.length > 0 ? receiptWarnings.join(" · ") : undefined;
  const warning = [cascadeWarning, deliveryWarning].filter(Boolean).join(" · ") || undefined;

  return NextResponse.json(
    {
      data: {
        payments: result.payments,
        primaryPayment: result.primaryPayment,
        applied: result.applied,
        // Backward-compatible single payment field
        payment: result.primaryPayment,
      },
      ...(warning ? { warning } : {}),
    },
    { status: 201 },
  );
}
