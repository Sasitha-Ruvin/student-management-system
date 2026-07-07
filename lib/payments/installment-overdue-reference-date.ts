import type { Prisma } from "@/app/generated/prisma";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type OverdueAsOfMode = "payment_date" | "today";

/**
 * Reference date for overdue checks when editing an instalment.
 * payment_date: latest non-void payment on the instalment, else today.
 */
export async function resolveInstallmentOverdueReferenceDate(
  installmentId: string,
  mode: OverdueAsOfMode,
  tx: Prisma.TransactionClient = defaultPrisma,
): Promise<Date> {
  if (mode === "today") {
    return new Date();
  }

  const latest = await tx.payment.findFirst({
    where: { installmentId, voidedAt: null },
    orderBy: { paymentDate: "desc" },
    select: { paymentDate: true },
  });

  return latest?.paymentDate ?? new Date();
}
