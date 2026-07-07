import {
  allocatePayment,
  computeInstallmentBalance,
  type InstallmentBalanceInput,
} from "@/lib/payments/installment-balance";

export type CascadeInstallmentInput = {
  installmentId: string;
  label: string;
  order: number;
  status: string;
  amount: number;
  paidAmount: number;
  overdueCharge: number;
  overdueChargePaid: number;
  overdueChargeWaived: boolean;
};

export type CascadeAppliedSlice = {
  installmentId: string;
  label: string;
  amount: number;
};

/**
 * Plans how a payment amount is split across instalments (same rules as server cascade).
 * Does not apply overdue charges — pass balances already reflecting pending fees.
 */
export function planPaymentCascade(
  installments: CascadeInstallmentInput[],
  startInstallmentId: string,
  totalAmount: number,
  opts?: { waiveFirstOverdue?: boolean },
): { applied: CascadeAppliedSlice[]; remaining: number } {
  const waiveFirst = opts?.waiveFirstOverdue === true;
  const sorted = [...installments].sort((a, b) => a.order - b.order);
  const startIdx = sorted.findIndex((i) => i.installmentId === startInstallmentId);
  if (startIdx < 0) {
    return { applied: [], remaining: totalAmount };
  }

  let remaining = totalAmount;
  const applied: CascadeAppliedSlice[] = [];
  let isFirst = true;

  for (let i = startIdx; i < sorted.length && remaining > 0.001; i++) {
    const inst = sorted[i];
    if (inst.status === "CANCELLED" || inst.status === "PAID") continue;

    const balanceInput: InstallmentBalanceInput = {
      amount: inst.amount,
      paidAmount: inst.paidAmount,
      overdueCharge: inst.overdueCharge,
      overdueChargePaid: inst.overdueChargePaid,
      overdueChargeWaived:
        (isFirst && waiveFirst) || inst.overdueChargeWaived,
    };

    const { totalRemaining } = computeInstallmentBalance(balanceInput);
    if (totalRemaining <= 0.001) continue;

    const slice = Math.min(remaining, totalRemaining);
    const allocation = allocatePayment(balanceInput, slice);

    applied.push({
      installmentId: inst.installmentId,
      label: inst.label,
      amount: Math.round(slice * 100) / 100,
    });

    remaining = Math.round((remaining - slice) * 100) / 100;

    // Update in-memory state for subsequent slices in preview
    inst.paidAmount = allocation.newPaidAmount;
    inst.overdueChargePaid = allocation.newOverdueChargePaid;
    if (isFirst && waiveFirst) {
      inst.overdueChargeWaived = true;
    }

    isFirst = false;
  }

  return { applied, remaining: Math.round(remaining * 100) / 100 };
}
