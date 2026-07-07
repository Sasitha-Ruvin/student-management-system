import type { Prisma } from "@/app/generated/prisma";
import { computeInstallmentBalance } from "@/lib/payments/installment-balance";
import { parseRegFeeEnrollmentId } from "@/lib/payments/registration-fee";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type TransferInstallmentBalanceLine = {
  installmentId: string;
  label: string;
  status: string;
  amount: number;
  paidAmount: number;
  overdueFeePaid: number;
  willCancel: boolean;
  unpaidBeforeCancel: number;
};

export type TransferBalancePreview = {
  sourceEnrollmentId: string;
  sourceBatchCode: string;
  regFeePaid: boolean;
  registrationFeeCollected: number;
  installmentCollected: number;
  totalCollected: number;
  cancelledUnpaidTotal: number;
  installments: TransferInstallmentBalanceLine[];
};

const CANCELLABLE = new Set(["PENDING", "PARTIAL", "OVERDUE"]);

export async function computeTransferBalance(
  sourceEnrollmentId: string,
  client: Tx | typeof defaultPrisma = defaultPrisma,
): Promise<TransferBalancePreview | null> {
  const enrollment = await client.enrollment.findUnique({
    where: { id: sourceEnrollmentId },
    select: {
      id: true,
      studentId: true,
      regFeePaid: true,
      batch: { select: { batchCode: true, registrationFee: true } },
      installments: {
        orderBy: { order: "asc" },
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
      },
    },
  });

  if (!enrollment?.batch) return null;

  const regFeePayments = await client.payment.findMany({
    where: {
      voidedAt: null,
      studentId: enrollment.studentId,
      OR: [
        { paymentTag: { startsWith: "REG_FEE:" } },
        { notes: { startsWith: "REG_FEE:" } },
      ],
    },
    select: {
      amount: true,
      paymentTag: true,
      reference: true,
      referenceEnc: true,
      notes: true,
      notesEnc: true,
      voidReason: true,
      voidReasonEnc: true,
    },
  });

  let registrationFeeCollected = 0;
  for (const p of regFeePayments) {
    const eid = parseRegFeeEnrollmentId(p);
    if (eid === sourceEnrollmentId) {
      registrationFeeCollected += Number(p.amount);
    }
  }

  if (registrationFeeCollected === 0 && enrollment.regFeePaid) {
    registrationFeeCollected = Number(enrollment.batch.registrationFee);
  }

  let installmentCollected = 0;
  let cancelledUnpaidTotal = 0;
  const installments: TransferInstallmentBalanceLine[] = [];

  for (const inst of enrollment.installments) {
    const amount = Number(inst.amount);
    const paidAmount = Number(inst.paidAmount);
    const overdueFeePaid = Number(inst.overdueChargePaid);
    installmentCollected += paidAmount + overdueFeePaid;

    const willCancel = CANCELLABLE.has(inst.status);
    const balance = computeInstallmentBalance({
      amount,
      paidAmount,
      overdueCharge: Number(inst.overdueCharge),
      overdueChargePaid: overdueFeePaid,
      overdueChargeWaived: inst.overdueChargeWaived,
    });

    if (willCancel) {
      cancelledUnpaidTotal += balance.totalRemaining;
    }

    installments.push({
      installmentId: inst.id,
      label: inst.label,
      status: inst.status,
      amount,
      paidAmount,
      overdueFeePaid,
      willCancel,
      unpaidBeforeCancel: willCancel ? balance.totalRemaining : 0,
    });
  }

  const totalCollected = installmentCollected + registrationFeeCollected;

  return {
    sourceEnrollmentId: enrollment.id,
    sourceBatchCode: enrollment.batch.batchCode,
    regFeePaid: enrollment.regFeePaid,
    registrationFeeCollected,
    installmentCollected,
    totalCollected,
    cancelledUnpaidTotal,
    installments,
  };
}
