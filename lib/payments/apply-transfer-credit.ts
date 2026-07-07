import type { Prisma } from "@/app/generated/prisma";

type Tx = Prisma.TransactionClient;

export type InstallmentAmountLine = {
  id: string;
  order: number;
  amount: number;
};

/**
 * Reduces instalment amounts from first to last until credit is exhausted.
 */
export function applyCreditToAmountLines(
  lines: { order: number; amount: number }[],
  credit: number,
): { lines: { order: number; amount: number }[]; applied: number } {
  const sorted = [...lines].sort((a, b) => a.order - b.order);
  let remaining = credit;
  let applied = 0;

  const updated = sorted.map((line) => {
    if (remaining <= 0.001) return line;
    const reduction = Math.min(line.amount, remaining);
    remaining -= reduction;
    applied += reduction;
    return { ...line, amount: Math.max(0, line.amount - reduction) };
  });

  return { lines: updated, applied };
}

export async function applyTransferCreditToEnrollment(
  tx: Tx,
  enrollmentId: string,
  credit: number,
  targetRegistrationFee: number,
): Promise<{ appliedToInstallments: number; regFeeCovered: boolean }> {
  const installments = await tx.installment.findMany({
    where: { enrollmentId },
    orderBy: { order: "asc" },
    select: { id: true, order: true, amount: true },
  });

  let remaining = credit;
  let appliedToInstallments = 0;

  for (const inst of installments) {
    if (remaining <= 0.001) break;
    const current = Number(inst.amount);
    const reduction = Math.min(current, remaining);
    if (reduction <= 0.001) continue;

    const newAmount = current - reduction;
    await tx.installment.update({
      where: { id: inst.id },
      data: { amount: newAmount },
    });
    remaining -= reduction;
    appliedToInstallments += reduction;
  }

  let regFeeCovered = false;
  if (
    remaining >= targetRegistrationFee - 0.001 &&
    targetRegistrationFee > 0.001
  ) {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { regFeePaid: true },
    });
    remaining -= targetRegistrationFee;
    regFeeCovered = true;
  }

  return { appliedToInstallments, regFeeCovered };
}

export async function sumNewEnrollmentPlanTotal(
  tx: Tx,
  enrollmentId: string,
): Promise<number> {
  const rows = await tx.installment.findMany({
    where: { enrollmentId },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}
