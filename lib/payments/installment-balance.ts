export type InstallmentBalanceInput = {
  amount: number;
  paidAmount: number;
  overdueCharge: number;
  overdueChargePaid: number;
  overdueChargeWaived: boolean;
};

export type InstallmentBalance = {
  baseRemaining: number;
  feeRemaining: number;
  totalRemaining: number;
  isFullyPaid: boolean;
};

export function computeInstallmentBalance(
  input: InstallmentBalanceInput,
): InstallmentBalance {
  const baseRemaining = Math.max(0, input.amount - input.paidAmount);
  const feeRemaining = input.overdueChargeWaived
    ? 0
    : Math.max(0, input.overdueCharge - input.overdueChargePaid);
  const totalRemaining = baseRemaining + feeRemaining;

  return {
    baseRemaining,
    feeRemaining,
    totalRemaining,
    isFullyPaid: totalRemaining === 0,
  };
}

/** Allocate a payment: base instalment first, then overdue fee. */
export function allocatePayment(
  input: InstallmentBalanceInput,
  paymentAmount: number,
): {
  toBase: number;
  toFee: number;
  newPaidAmount: number;
  newOverdueChargePaid: number;
} {
  const { baseRemaining, feeRemaining } = computeInstallmentBalance(input);
  const toBase = Math.min(paymentAmount, baseRemaining);
  const remainder = paymentAmount - toBase;
  const toFee = Math.min(remainder, feeRemaining);

  return {
    toBase,
    toFee,
    newPaidAmount: input.paidAmount + toBase,
    newOverdueChargePaid: input.overdueChargePaid + toFee,
  };
}

/** Infer how an existing payment was split between base instalment and overdue fee. */
export function inferPaymentAllocation(
  after: InstallmentBalanceInput,
  paymentAmount: number,
): { toBase: number; toFee: number } {
  const cents = Math.round(paymentAmount * 100);
  for (let tb = 0; tb <= cents; tb++) {
    const toBase = tb / 100;
    const toFee = Math.round((paymentAmount - toBase) * 100) / 100;
    const before: InstallmentBalanceInput = {
      amount: after.amount,
      paidAmount: after.paidAmount - toBase,
      overdueCharge: after.overdueCharge,
      overdueChargePaid: after.overdueChargePaid - toFee,
      overdueChargeWaived: after.overdueChargeWaived,
    };
    if (before.paidAmount < -0.001 || before.overdueChargePaid < -0.001) {
      continue;
    }
    const alloc = allocatePayment(before, paymentAmount);
    if (
      Math.abs(alloc.toBase - toBase) < 0.02 &&
      Math.abs(alloc.toFee - toFee) < 0.02
    ) {
      return { toBase: alloc.toBase, toFee: alloc.toFee };
    }
  }
  return { toBase: paymentAmount, toFee: 0 };
}
