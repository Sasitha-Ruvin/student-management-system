import type { Prisma } from "@/app/generated/prisma";

export const LEGACY_ALUMNI_BATCH_CODE_SUFFIX = "-LEGACY-ALUMNI";

export function isLegacyAlumniBatch(batchCode: string): boolean {
  return batchCode.endsWith(LEGACY_ALUMNI_BATCH_CODE_SUFFIX);
}

export async function getOrCreateLegacyAlumniBatch(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<{ id: string; branchId: string; batchCode: string }> {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { branchCode: true },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  const batchCode = `${branch.branchCode}${LEGACY_ALUMNI_BATCH_CODE_SUFFIX}`;
  const existing = await tx.batch.findUnique({
    where: { batchCode },
    select: { id: true, branchId: true, batchCode: true },
  });

  if (existing) {
    return existing;
  }

  return tx.batch.create({
    data: {
      batchCode,
      name: "Pre-system alumni",
      branchId,
      startDate: new Date("2000-01-01"),
      endDate: new Date("2000-01-02"),
      status: "COMPLETED",
      totalSessions: 0,
      registrationFee: 0,
      courseFee: 0,
    },
    select: { id: true, branchId: true, batchCode: true },
  });
}

export function buildLegacyAlumniNotes(
  graduatedIntake?: string | null,
  notes?: string | null,
): string | null {
  const parts: string[] = [];
  const intake = graduatedIntake?.trim();
  const extra = notes?.trim();

  if (intake) {
    parts.push(`Graduated intake: ${intake}`);
  }
  if (extra) {
    parts.push(extra);
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function parseGraduatedIntakeFromNotes(
  notes: string | null,
): string | null {
  if (!notes) return null;
  const firstLine = notes.split("\n\n")[0] ?? notes;
  const match = firstLine.match(/^Graduated intake:\s*(.+)$/);
  return match?.[1]?.trim() ?? null;
}
