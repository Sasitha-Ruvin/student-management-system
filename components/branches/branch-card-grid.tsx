"use client";

import type { BranchListItemDto } from "@/types/api/branch";

import { BranchCard } from "./branch-card";

type BranchCardGridProps = {
  branches: BranchListItemDto[];
  onDeactivate: (branch: BranchListItemDto) => void;
  onEdit?: (id: string) => void;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingBranchId?: string | null;
  deactivatingBranchId?: string | null;
};

export function BranchCardGrid({
  branches,
  onDeactivate,
  onEdit,
  onNavigate,
  onPrefetch,
  navigatingBranchId = null,
  deactivatingBranchId = null,
}: BranchCardGridProps) {
  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 bg-tertiary-100/50 px-4 py-12 text-center text-neutral-600">
        No branches match your filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {branches.map((branch) => (
        <BranchCard
          key={branch.id}
          branch={branch}
          onDeactivate={onDeactivate}
          onEdit={onEdit}
          onNavigate={onNavigate}
          onPrefetch={onPrefetch}
          isNavigating={navigatingBranchId === branch.id}
          isDeactivating={deactivatingBranchId === branch.id}
        />
      ))}
    </div>
  );
}
