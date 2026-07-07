import type { InstallmentStatus, Prisma } from "@/app/generated/prisma";
import {
  allocatePayment,
  computeInstallmentBalance,
  type InstallmentBalanceInput,
} from "@/lib/payments/installment-balance";
import {
  deriveInstallmentStatusFromState,
  replayPaymentsOnState,
} from "@/lib/payments/replay-installment-state";
import { prisma as defaultPrisma } from "@/lib/prisma";

export { deriveInstallmentStatusFromState, replayPaymentsOnState };

type Tx = Prisma.TransactionClient;

export type ReplayInstallmentResult = {
  installmentId: string;
  paidAmount: number;
  overdueChargePaid: number;
  status: InstallmentStatus;
  activePaymentCount: number;
  baseRemaining: number;
  feeRemaining: number;
  totalRemaining: number;
};

/**
 * Recomputes installment paidAmount / overdueChargePaid / status from all
 * non-voided payments in chronological order.
 */
export async function replayInstallmentBalances(
  installmentId: string,
  tx: Tx = defaultPrisma,
): Promise<ReplayInstallmentResult> {
  const installment = await tx.installment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      overdueCharge: true,
      overdueChargeWaived: true,
      status: true,
    },
  });

  if (!installment) {
    throw new Error("Installment not found");
  }

  if (installment.status === "CANCELLED") {
    return {
      installmentId,
      paidAmount: Number(installment.amount),
      overdueChargePaid: 0,
      status: "CANCELLED",
      activePaymentCount: 0,
      baseRemaining: 0,
      feeRemaining: 0,
      totalRemaining: 0,
    };
  }

  const payments = await tx.payment.findMany({
    where: { installmentId, voidedAt: null },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    select: { amount: true },
  });

  let state: InstallmentBalanceInput = {
    amount: Number(installment.amount),
    paidAmount: 0,
    overdueCharge: Number(installment.overdueCharge),
    overdueChargePaid: 0,
    overdueChargeWaived: installment.overdueChargeWaived,
  };

  for (const p of payments) {
    const allocation = allocatePayment(state, Number(p.amount));
    state = {
      ...state,
      paidAmount: allocation.newPaidAmount,
      overdueChargePaid: allocation.newOverdueChargePaid,
    };
  }

  const balance = computeInstallmentBalance(state);
  const newStatus = deriveInstallmentStatusFromState(
    state,
    installment.dueDate,
    installment.status,
  );

  await tx.installment.update({
    where: { id: installmentId },
    data: {
      paidAmount: state.paidAmount,
      overdueChargePaid: state.overdueChargePaid,
      status: newStatus,
    },
  });

  return {
    installmentId,
    paidAmount: state.paidAmount,
    overdueChargePaid: state.overdueChargePaid,
    status: newStatus,
    activePaymentCount: payments.length,
    baseRemaining: balance.baseRemaining,
    feeRemaining: balance.feeRemaining,
    totalRemaining: balance.totalRemaining,
  };
}
