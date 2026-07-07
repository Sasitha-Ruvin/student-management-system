import type { BranchListItemDto } from "@/types/api/branch";

export function computeBranchStats(branches: BranchListItemDto[]) {
  return {
    activeBranchCount: branches.filter((b) => b.isActive).length,
    totalStudents: branches.reduce((s, b) => s + b.activeStudentCount, 0),
    activeBatchCount: branches.reduce((s, b) => s + b.activeBatchCount, 0),
  };
}
