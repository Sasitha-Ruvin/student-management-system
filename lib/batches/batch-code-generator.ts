import type { PrismaClient } from "@/app/generated/prisma";

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Generates a batch code in the format: {BRANCH_CODE}-{YYYY}-{MON}
 * e.g. COL-2025-JAN. Appends -2, -3 on collision.
 */
export async function generateUniqueBatchCode(
  prisma: PrismaClient,
  branchCode: string,
  startDate: Date,
): Promise<string> {
  const year = startDate.getFullYear();
  const month = MONTH_ABBR[startDate.getMonth()];
  const base = `${branchCode}-${year}-${month}`;

  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.batch.findUnique({
      where: { batchCode: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    candidate = `${base}-${suffix}`;
    suffix++;
  }
}
