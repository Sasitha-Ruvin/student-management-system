import type { BranchListItem } from "@/types/api/branch";

type BranchWithOpenBatches = {
  id: string;
  branchCode: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
  batches: { _count: { enrollments: number } }[];
};

export function toBranchListItem(branch: BranchWithOpenBatches): BranchListItem {
  const activeBatchCount = branch.batches.length;
  const activeStudentCount = branch.batches.reduce(
    (sum, batch) => sum + batch._count.enrollments,
    0,
  );

  return {
    id: branch.id,
    branchCode: branch.branchCode,
    name: branch.name,
    location: branch.location,
    isActive: branch.isActive,
    activeBatchCount,
    activeStudentCount,
    createdAt: branch.createdAt.toISOString(),
  };
}

export const openBatchesInclude = {
  where: { status: "OPEN" as const },
  include: {
    _count: {
      select: {
        enrollments: { where: { status: "ACTIVE" as const } },
      },
    },
  },
};
