import type { Prisma } from "@/app/generated/prisma";
import type { InstallmentStatus } from "@/types/api/payment";
import { deriveInstallmentStatusFromState } from "@/lib/payments/replay-installment-state";

type OpenInstallmentRow = {
  id: string;
  amount: unknown;
  paidAmount: unknown;
  dueDate: Date;
  status: InstallmentStatus;
  overdueCharge: unknown;
  overdueChargePaid: unknown;
  overdueChargeWaived: boolean;
};

export async function recalculateOpenInstallmentAmounts(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  oldEffectiveFee: number,
  newEffectiveFee: number,
): Promise<number> {
  if (oldEffectiveFee <= 0 || newEffectiveFee <= 0) return 0;
  if (Math.abs(oldEffectiveFee - newEffectiveFee) < 0.001) return 0;

  const scaleFactor = newEffectiveFee / oldEffectiveFee;

  const installments = await tx.installment.findMany({
    where: { enrollmentId },
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      status: true,
      overdueCharge: true,
      overdueChargePaid: true,
      overdueChargeWaived: true,
    },
  });

  let updated = 0;

  for (const inst of installments) {
    const row = inst as OpenInstallmentRow;
    const paidAmount = Number(row.paidAmount);
    if (paidAmount > 0.001) continue;
    if (row.status === "PAID" || row.status === "CANCELLED") continue;

    const nextAmount = Math.round(Number(row.amount) * scaleFactor * 100) / 100;
    const nextStatus = deriveInstallmentStatusFromState(
      {
        amount: nextAmount,
        paidAmount,
        overdueCharge: Number(row.overdueCharge),
        overdueChargePaid: Number(row.overdueChargePaid),
        overdueChargeWaived: row.overdueChargeWaived,
      },
      row.dueDate,
      row.status,
    );

    await tx.installment.update({
      where: { id: row.id },
      data: { amount: nextAmount, status: nextStatus },
    });
    updated += 1;
  }

  return updated;
}
