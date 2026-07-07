import { createInvoiceForPayment } from "@/lib/payments/next-invoice-number";
import { encryptPaymentSensitiveForWrite } from "@/lib/payments/payment-sensitive";
import {
  buildRegFeeUserNotes,
  regFeePaymentTag,
} from "@/lib/payments/registration-fee";
import { mapPaymentRecord, PAYMENT_SENSITIVE_SELECT } from "@/lib/payments/map-payment-record";
import { prisma } from "@/lib/prisma";
import type {
  PaymentRecord,
  RecordRegistrationPaymentRequest,
} from "@/types/api/payment";

export class RegistrationPaymentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "RegistrationPaymentError";
  }
}

export async function recordRegistrationPayment(
  data: RecordRegistrationPaymentRequest,
  recordedById: string,
): Promise<PaymentRecord> {
  const paymentDate = new Date(data.paymentDate);
  if (isNaN(paymentDate.getTime())) {
    throw new RegistrationPaymentError("Invalid paymentDate", 400);
  }

  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: { id: data.enrollmentId, studentId: data.studentId },
      select: {
        id: true,
        regFeePaid: true,
        batch: {
          select: {
            batchCode: true,
            registrationFee: true,
            branchId: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new RegistrationPaymentError(
        "Enrollment not found for this student",
        404,
      );
    }

    if (!enrollment.batch) {
      throw new RegistrationPaymentError(
        "Enrollment has no batch — assign a batch before recording registration fee",
        422,
      );
    }

    if (enrollment.regFeePaid) {
      throw new RegistrationPaymentError(
        "Registration fee has already been recorded for this enrollment",
        422,
      );
    }

    const maxAmount = Number(enrollment.batch.registrationFee);
    const amount = data.amount;

    if (amount <= 0) {
      throw new RegistrationPaymentError("Amount must be greater than 0", 400);
    }

    if (amount > maxAmount + 0.001) {
      throw new RegistrationPaymentError(
        `Amount cannot exceed the batch registration fee (${maxAmount})`,
        400,
      );
    }

    const sensitiveWrite = encryptPaymentSensitiveForWrite({
      paymentTag: regFeePaymentTag(data.enrollmentId),
      reference: data.reference ?? null,
      notes: buildRegFeeUserNotes(data.notes),
    });

    const payment = await tx.payment.create({
      data: {
        studentId: data.studentId,
        installmentId: null,
        amount,
        paymentDate,
        method: data.method,
        recordedById,
        ...sensitiveWrite,
      },
      select: {
        id: true,
        studentId: true,
        installmentId: true,
        amount: true,
        paymentDate: true,
        method: true,
        createdAt: true,
        ...PAYMENT_SENSITIVE_SELECT,
        recordedBy: { select: { name: true } },
      },
    });

    const invoice = await createInvoiceForPayment(tx, {
      studentId: data.studentId,
      paymentId: payment.id,
      amount,
    });

    await tx.enrollment.update({
      where: { id: data.enrollmentId },
      data: { regFeePaid: true },
    });

    return mapPaymentRecord({
      ...payment,
      installmentId: null,
      installment: null,
      invoice,
    });
  });
}
