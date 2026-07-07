import type { Prisma } from "@/app/generated/prisma";
import { computeOverdueChargeForRemainder } from "@/lib/payments/overdue-charge";
import { prisma as defaultPrisma } from "@/lib/prisma";

const SETTINGS_ID = "default";

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Marks an instalment overdue and stamps a fee proportional to unpaid base when the
 * payment (or reference) date is after the due date.
 */
export async function ensureInstallmentOverdueCharge(
  installmentId: string,
  asOfDate: Date,
  tx: Prisma.TransactionClient = defaultPrisma,
): Promise<void> {
  const installment = await tx.installment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      status: true,
      overdueCharge: true,
      overdueChargeAppliedAt: true,
      overdueChargeWaived: true,
    },
  });

  if (!installment) return;
  if (installment.status === "PAID" || installment.status === "CANCELLED") {
    return;
  }
  if (installment.overdueChargeWaived) return;

  const dueDay = startOfDay(installment.dueDate);
  const asOfDay = startOfDay(asOfDate);
  if (asOfDay <= dueDay) return;

  const settings = await tx.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      overdueChargeEnabled: true,
      overdueChargeAmount: true,
      overdueChargeEnabledSince: true,
    },
  });

  const chargeEnabled = settings?.overdueChargeEnabled ?? false;
  const settingsAmount = Number(settings?.overdueChargeAmount ?? 0);
  const enabledSince = settings?.overdueChargeEnabledSince ?? null;

  const statusUpdate =
    installment.status === "PENDING" || installment.status === "PARTIAL"
      ? { status: "OVERDUE" as const }
      : {};

  if (!chargeEnabled || !enabledSince || settingsAmount <= 0) {
    if (Object.keys(statusUpdate).length > 0) {
      await tx.installment.update({
        where: { id: installmentId },
        data: statusUpdate,
      });
    }
    return;
  }

  const enabledSinceDay = startOfDay(enabledSince);
  if (dueDay < enabledSinceDay) {
    if (Object.keys(statusUpdate).length > 0) {
      await tx.installment.update({
        where: { id: installmentId },
        data: statusUpdate,
      });
    }
    return;
  }

  const installmentAmount = Number(installment.amount);
  const paidAmount = Number(installment.paidAmount);
  const baseRemaining = Math.max(0, installmentAmount - paidAmount);
  const computedCharge = computeOverdueChargeForRemainder(
    settingsAmount,
    installmentAmount,
    baseRemaining,
  );

  if (computedCharge <= 0) {
    if (Object.keys(statusUpdate).length > 0) {
      await tx.installment.update({
        where: { id: installmentId },
        data: statusUpdate,
      });
    }
    return;
  }

  await tx.installment.update({
    where: { id: installmentId },
    data: {
      ...statusUpdate,
      overdueCharge: computedCharge,
      overdueChargeAppliedAt: installment.overdueChargeAppliedAt ?? new Date(),
    },
  });
}
