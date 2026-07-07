import type { Prisma } from "@/app/generated/prisma";
import {
  allocatePayment,
  computeInstallmentBalance,
} from "@/lib/payments/installment-balance";
import { ensureInstallmentOverdueCharge } from "@/lib/payments/ensure-installment-overdue-charge";
import { createInvoiceForPayment } from "@/lib/payments/next-invoice-number";
import { prisma } from "@/lib/prisma";
import { mapPaymentRecord, PAYMENT_SENSITIVE_SELECT } from "@/lib/payments/map-payment-record";
import { encryptPaymentSensitiveForWrite } from "@/lib/payments/payment-sensitive";
import type {
  RecordPaymentRequest,
  PaymentRecord,
  CascadeAppliedSlice,
} from "@/types/api/payment";

export class PaymentCascadeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PaymentCascadeError";
  }
}

export type RecordPaymentCascadeResult = {
  payments: PaymentRecord[];
  primaryPayment: PaymentRecord;
  applied: CascadeAppliedSlice[];
  baseRemaining: number;
  feeRemaining: number;
  totalRemaining: number;
};

const installmentSelect = {
  id: true,
  label: true,
  order: true,
  amount: true,
  paidAmount: true,
  overdueCharge: true,
  overdueChargePaid: true,
  overdueChargeWaived: true,
  status: true,
  enrollmentId: true,
  enrollment: { select: { studentId: true, status: true } },
} as const;

async function applySlice(
  tx: Prisma.TransactionClient,
  opts: {
    installmentId: string;
    studentId: string;
    sliceAmount: number;
    paymentDate: Date;
    method: RecordPaymentRequest["method"];
    reference: string | null;
    notes: string | null;
    recordedById: string;
    waiveOverdue: boolean;
  },
): Promise<PaymentRecord> {
  const current = await tx.installment.findUnique({
    where: { id: opts.installmentId },
    select: {
      amount: true,
      paidAmount: true,
      overdueCharge: true,
      overdueChargePaid: true,
      overdueChargeWaived: true,
      status: true,
    },
  });

  if (!current) {
    throw new PaymentCascadeError("Installment not found", 404);
  }

  const balanceInput = {
    amount: Number(current.amount),
    paidAmount: Number(current.paidAmount),
    overdueCharge: Number(current.overdueCharge),
    overdueChargePaid: Number(current.overdueChargePaid),
    overdueChargeWaived: opts.waiveOverdue || current.overdueChargeWaived,
  };

  const allocation = allocatePayment(balanceInput, opts.sliceAmount);
  const after = computeInstallmentBalance({
    ...balanceInput,
    paidAmount: allocation.newPaidAmount,
    overdueChargePaid: allocation.newOverdueChargePaid,
  });

  const newStatus = after.isFullyPaid
    ? "PAID"
    : allocation.newPaidAmount > 0 || allocation.newOverdueChargePaid > 0
      ? "PARTIAL"
      : current.status;

  const payment = await tx.payment.create({
    data: {
      studentId: opts.studentId,
      installmentId: opts.installmentId,
      amount: opts.sliceAmount,
      paymentDate: opts.paymentDate,
      method: opts.method,
      recordedById: opts.recordedById,
      ...encryptPaymentSensitiveForWrite({
        reference: opts.reference,
        notes: opts.notes,
      }),
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
      installment: { select: { label: true } },
      recordedBy: { select: { name: true } },
    },
  });

  await tx.installment.update({
    where: { id: opts.installmentId },
    data: {
      paidAmount: allocation.newPaidAmount,
      overdueChargePaid: allocation.newOverdueChargePaid,
      status: newStatus,
      ...(opts.waiveOverdue ? { overdueChargeWaived: true } : {}),
    },
  });

  const invoice = await createInvoiceForPayment(tx, {
    studentId: opts.studentId,
    paymentId: payment.id,
    amount: opts.sliceAmount,
  });

  return mapPaymentRecord({ ...payment, invoice });
}

/**
 * Records a payment starting at the given instalment; surplus cascades to later
 * unpaid instalments on the same enrollment (one Payment + Invoice per slice).
 */
export async function recordPaymentCascade(
  data: RecordPaymentRequest,
  recordedById: string,
): Promise<RecordPaymentCascadeResult> {
  const paymentDate = new Date(data.paymentDate);
  const waiveFirst = data.waiveOverdueCharge === true;

  return prisma.$transaction(async (tx) => {
    const start = await tx.installment.findUnique({
      where: { id: data.installmentId },
      select: installmentSelect,
    });

    if (!start) {
      throw new PaymentCascadeError("Installment not found", 404);
    }

    if (start.status === "CANCELLED") {
      throw new PaymentCascadeError(
        "Cannot record payment against a cancelled installment",
        422,
      );
    }

    if (start.enrollment.status === "DROPPED") {
      throw new PaymentCascadeError(
        "Cannot record payment for a dropped enrollment",
        422,
      );
    }

    if (start.enrollment.studentId !== data.studentId) {
      throw new PaymentCascadeError(
        "Installment does not belong to this student",
        403,
      );
    }

    const allInstallments = await tx.installment.findMany({
      where: { enrollmentId: start.enrollmentId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        label: true,
        order: true,
        status: true,
      },
    });

    const startIdx = allInstallments.findIndex((i) => i.id === data.installmentId);
    if (startIdx < 0) {
      throw new PaymentCascadeError("Installment not found", 404);
    }

    let remaining = data.amount;
    const payments: PaymentRecord[] = [];
    const applied: CascadeAppliedSlice[] = [];
    let isFirstSlice = true;

    for (let i = startIdx; i < allInstallments.length && remaining > 0.001; i++) {
      const instRef = allInstallments[i];

      const fresh = await tx.installment.findUnique({
        where: { id: instRef.id },
        select: {
          id: true,
          label: true,
          status: true,
          amount: true,
          paidAmount: true,
          overdueCharge: true,
          overdueChargePaid: true,
          overdueChargeWaived: true,
        },
      });

      if (!fresh) continue;
      if (fresh.status === "CANCELLED" || fresh.status === "PAID") continue;

      const waiveThisSlice = isFirstSlice && waiveFirst;

      if (!waiveThisSlice) {
        await ensureInstallmentOverdueCharge(instRef.id, paymentDate, tx);
      }

      const afterOverdue = await tx.installment.findUnique({
        where: { id: instRef.id },
        select: {
          amount: true,
          paidAmount: true,
          overdueCharge: true,
          overdueChargePaid: true,
          overdueChargeWaived: true,
          status: true,
        },
      });

      if (!afterOverdue) continue;

      const balanceInput = {
        amount: Number(afterOverdue.amount),
        paidAmount: Number(afterOverdue.paidAmount),
        overdueCharge: Number(afterOverdue.overdueCharge),
        overdueChargePaid: Number(afterOverdue.overdueChargePaid),
        overdueChargeWaived:
          waiveThisSlice || afterOverdue.overdueChargeWaived,
      };

      const { totalRemaining } = computeInstallmentBalance(balanceInput);
      if (totalRemaining <= 0.001) continue;

      const slice = Math.min(remaining, totalRemaining);
      const adminNotes =
        isFirstSlice && payments.length === 0
          ? data.notes ?? null
          : null;

      const record = await applySlice(tx, {
        installmentId: instRef.id,
        studentId: data.studentId,
        sliceAmount: Math.round(slice * 100) / 100,
        paymentDate,
        method: data.method,
        reference: isFirstSlice ? (data.reference ?? null) : null,
        notes: adminNotes,
        recordedById,
        waiveOverdue: waiveThisSlice,
      });

      payments.push(record);
      applied.push({
        installmentId: instRef.id,
        label: fresh.label,
        amount: record.amount,
      });

      remaining = Math.round((remaining - slice) * 100) / 100;
      isFirstSlice = false;
    }

    if (remaining > 0.01) {
      throw new PaymentCascadeError(
        "Amount exceeds total remaining balance for this enrollment",
        422,
      );
    }

    if (payments.length === 0) {
      throw new PaymentCascadeError(
        "No unpaid instalments available for this payment",
        422,
      );
    }

    const lastInst = await tx.installment.findUnique({
      where: { id: payments[payments.length - 1].installmentId! },
      select: {
        amount: true,
        paidAmount: true,
        overdueCharge: true,
        overdueChargePaid: true,
        overdueChargeWaived: true,
      },
    });

    const tailBalance = lastInst
      ? computeInstallmentBalance({
          amount: Number(lastInst.amount),
          paidAmount: Number(lastInst.paidAmount),
          overdueCharge: Number(lastInst.overdueCharge),
          overdueChargePaid: Number(lastInst.overdueChargePaid),
          overdueChargeWaived: lastInst.overdueChargeWaived,
        })
      : { baseRemaining: 0, feeRemaining: 0, totalRemaining: 0 };

    const primaryPayment = payments[0];

    return {
      payments,
      primaryPayment,
      applied,
      baseRemaining: tailBalance.baseRemaining,
      feeRemaining: tailBalance.feeRemaining,
      totalRemaining: tailBalance.totalRemaining,
    };
  });
}
