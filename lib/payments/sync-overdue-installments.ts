import { computeOverdueChargeForRemainder } from "@/lib/payments/overdue-charge";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Marks past-due instalments as OVERDUE and applies proportional overdue fees
 * based on unpaid base remainder. Safe to call before payment list / dashboard reads.
 */
export async function syncOverdueInstallments(): Promise<void> {
  const today = startOfToday();

  const settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      overdueChargeEnabled: true,
      overdueChargeAmount: true,
      overdueChargeEnabledSince: true,
    },
  });

  const chargeEnabled = settings?.overdueChargeEnabled ?? false;
  const settingsAmount = Number(settings?.overdueChargeAmount ?? 2500);
  const enabledSince = settings?.overdueChargeEnabledSince ?? null;

  await prisma.installment.updateMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  if (!chargeEnabled || !enabledSince || settingsAmount <= 0) {
    return;
  }

  const enabledSinceMidnight = new Date(enabledSince);
  enabledSinceMidnight.setHours(0, 0, 0, 0);

  const pastDue = await prisma.installment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lt: today, gte: enabledSinceMidnight },
      overdueChargeWaived: false,
    },
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      overdueCharge: true,
      overdueChargeAppliedAt: true,
    },
  });

  const now = new Date();

  for (const inst of pastDue) {
    const installmentAmount = Number(inst.amount);
    const paidAmount = Number(inst.paidAmount);
    const baseRemaining = Math.max(0, installmentAmount - paidAmount);
    const existingCharge = Number(inst.overdueCharge);

    let charge = computeOverdueChargeForRemainder(
      settingsAmount,
      installmentAmount,
      baseRemaining,
    );

    // Base cleared but overdue fee may still be owed — keep stamped fee
    if (charge <= 0 && existingCharge > 0 && baseRemaining <= 0) {
      charge = existingCharge;
    }

    if (charge <= 0) continue;

    await prisma.installment.update({
      where: { id: inst.id },
      data: {
        status: "OVERDUE",
        overdueCharge: charge,
        overdueChargeAppliedAt: inst.overdueChargeAppliedAt ?? now,
      },
    });
  }
}
