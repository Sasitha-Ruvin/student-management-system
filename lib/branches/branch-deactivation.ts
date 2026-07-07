import { prisma } from "@/lib/prisma";

/** ACTIVE enrollments in OPEN batches at this branch (matches list `activeStudentCount`). */
export async function countActiveStudentsAtBranch(
  branchId: string,
): Promise<number> {
  const enrollmentGroups = await prisma.enrollment.groupBy({
    by: ["batchId"],
    where: {
      status: "ACTIVE",
      batchId: { not: null },
      batch: { status: "OPEN", branchId },
    },
    _count: { _all: true },
  });

  return enrollmentGroups.reduce((sum, row) => sum + row._count._all, 0);
}

export async function assertCanDeactivateBranch(
  branchId: string,
): Promise<{ ok: true } | { ok: false; activeStudentCount: number }> {
  const activeStudentCount = await countActiveStudentsAtBranch(branchId);
  if (activeStudentCount > 0) {
    return { ok: false, activeStudentCount };
  }
  return { ok: true };
}
