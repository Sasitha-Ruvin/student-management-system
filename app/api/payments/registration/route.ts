import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { notifyPaymentReceipts } from "@/lib/payments/notify-payment-receipts";
import {
  recordRegistrationPayment,
  RegistrationPaymentError,
} from "@/lib/payments/record-registration-payment";
import { prisma } from "@/lib/prisma";
import type { RecordRegistrationPaymentRequest } from "@/types/api/payment";

const VALID_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"] as const;

/**
 * POST /api/payments/registration
 *
 * Records a registration fee payment (installmentId null) and sets regFeePaid.
 */
export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  let body: RecordRegistrationPaymentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errors: Record<string, string> = {};

  if (!body.studentId || typeof body.studentId !== "string") {
    errors.studentId = "studentId is required";
  }
  if (!body.enrollmentId || typeof body.enrollmentId !== "string") {
    errors.enrollmentId = "enrollmentId is required";
  }

  const amount = Number(body.amount);
  if (!body.amount || isNaN(amount)) {
    errors.amount = "amount is required";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!body.paymentDate) {
    errors.paymentDate = "paymentDate is required";
  } else if (isNaN(new Date(body.paymentDate).getTime())) {
    errors.paymentDate = "paymentDate must be a valid date";
  }

  if (!body.method) {
    errors.method = "method is required";
  } else if (!VALID_METHODS.includes(body.method as (typeof VALID_METHODS)[number])) {
    errors.method = `method must be one of: ${VALID_METHODS.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  let payment;
  try {
    payment = await recordRegistrationPayment(
      {
        studentId: body.studentId,
        enrollmentId: body.enrollmentId,
        amount,
        paymentDate: body.paymentDate,
        method: body.method,
        reference: body.reference ?? null,
        notes: body.notes ?? null,
        sendEmail: body.sendEmail !== false,
        sendSms: body.sendSms === true,
      },
      admin.id,
    );
  } catch (err) {
    if (err instanceof RegistrationPaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message =
      err instanceof Error ? err.message : "Failed to record registration payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: body.enrollmentId },
    select: { batchId: true, batch: { select: { branchId: true } } },
  });

  invalidateOperationalData({
    batchId: enrollment?.batchId ?? undefined,
    branchId: enrollment?.batch?.branchId ?? undefined,
  });

  const sendEmail = body.sendEmail !== false;
  const sendSms = body.sendSms === true;
  let warning: string | undefined;

  if (sendEmail || sendSms) {
    try {
      const receiptWarnings = await notifyPaymentReceipts({
        paymentIds: [payment.paymentId],
        sendEmail,
        sendSms,
      });
      if (receiptWarnings.length > 0) {
        warning = receiptWarnings.join(" · ");
      }
    } catch (notifyErr) {
      console.warn("[payments/registration] Receipt delivery failed:", notifyErr);
      warning =
        notifyErr instanceof Error ? notifyErr.message : "Receipt delivery failed";
    }
  }

  return NextResponse.json(
    { data: { payment }, ...(warning ? { warning } : {}) },
    { status: 201 },
  );
}
