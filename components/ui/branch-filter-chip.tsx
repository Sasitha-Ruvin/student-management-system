"use client";

import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { X } from "@/lib/icons";
import { useBranchFilter } from "@/stores/branch-filter-store";

type BranchFilterChipProps = {
  className?: string;
};

export function BranchFilterChip({ className = "" }: BranchFilterChipProps) {
  const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
  const { branches } = useBranchesPicker();

  if (!selectedBranchId) {
    return (
      <span
        className={[
          "inline-flex items-center rounded-full border border-secondary-300/60 bg-secondary-100/50 px-3 py-1 text-xs text-neutral-600",
          className,
        ].join(" ")}
      >
        All branches
      </span>
    );
  }

  const branchName =
    branches.find((b) => b.id === selectedBranchId)?.name ?? "Selected branch";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-primary-900/20 bg-primary-900/5 px-3 py-1 text-xs font-medium text-primary-900",
        className,
      ].join(" ")}
    >
      {branchName}
      <button
        type="button"
        onClick={() => setSelectedBranchId(null)}
        className="flex size-5 items-center justify-center rounded-full hover:bg-primary-900/10"
        aria-label="Clear branch filter"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
