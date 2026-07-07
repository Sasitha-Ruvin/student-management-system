import type { PrismaClient } from "@/app/generated/prisma";

function baseCodeFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  return letters.padEnd(3, "X");
}

export async function generateUniqueBranchCode(
  prisma: PrismaClient,
  name: string,
  excludeBranchId?: string,
): Promise<string> {
  const base = baseCodeFromName(name);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.branch.findUnique({
      where: { branchCode: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeBranchId) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function backfillBranchCode(
  prisma: PrismaClient,
  branchId: string,
  name: string,
): Promise<string> {
  const code = await generateUniqueBranchCode(prisma, name, branchId);
  await prisma.branch.update({
    where: { id: branchId },
    data: { branchCode: code },
  });
  return code;
}
