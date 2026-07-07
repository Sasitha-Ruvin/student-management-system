import type { InstallmentStatus } from "@/app/generated/prisma";
import {
  allocatePayment,
  computeInstallmentBalance,
  type InstallmentBalanceInput,
} from "@/lib/payments/installment-balance";

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function deriveInstallmentStatusFromState(
  input: InstallmentBalanceInput,
  dueDate: Date,
  currentStatus: InstallmentStatus,
): InstallmentStatus {
  if (currentStatus === "CANCELLED") {
    return "CANCELLED";
  }

  const balance = computeInstallmentBalance(input);
  if (balance.isFullyPaid) {
    return "PAID";
  }

  const hasPaid =
    input.paidAmount > 0.001 || input.overdueChargePaid > 0.001;

  if (!hasPaid) {
    const today = startOfDay(new Date());
    const due = startOfDay(dueDate);
    return due < today ? "OVERDUE" : "PENDING";
  }

  return "PARTIAL";
}

/** Pure replay — applies payment amounts in order from zero. */
export function replayPaymentsOnState(
  installment: InstallmentBalanceInput,
  paymentAmounts: number[],
  currentStatus: InstallmentStatus = "PENDING",
  dueDate: Date = new Date(),
): {
  state: InstallmentBalanceInput;
  status: InstallmentStatus;
} {
  let state: InstallmentBalanceInput = {
    amount: installment.amount,
    paidAmount: 0,
    overdueCharge: installment.overdueCharge,
    overdueChargePaid: 0,
    overdueChargeWaived: installment.overdueChargeWaived,
  };

  for (const amt of paymentAmounts) {
    const allocation = allocatePayment(state, amt);
    state = {
      ...state,
      paidAmount: allocation.newPaidAmount,
      overdueChargePaid: allocation.newOverdueChargePaid,
    };
  }

  const status = deriveInstallmentStatusFromState(
    state,
    dueDate,
    currentStatus,
  );
  return { state, status };
}
