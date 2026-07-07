import type { PrismaClient } from "@/app/generated/prisma";

/**
 * Generates a model code in the format MOD-{YYYY}-{NNNNN}.
 * Sequential within each calendar year, zero-padded to 5 digits.
 * e.g. MOD-2026-00001, MOD-2026-00002
 */
export async function generateModelCode(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOD-${year}-`;

  const last = await prisma.student.findFirst({
    where: { modelCode: { startsWith: prefix } },
    orderBy: { modelCode: "desc" },
    select: { modelCode: true },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.modelCode.split("-");
    const lastSeq = parseInt(parts[2] ?? "0", 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}
