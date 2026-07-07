"use client";

import { useMemo } from "react";

import { Select } from "@/components/ui/select";
import { useBranchFilter } from "@/stores/branch-filter-store";
import { useBranchesPicker } from "@/contexts/branches-picker-context";

type SidebarBranchFilterProps = {
  collapsed: boolean;
};

export function SidebarBranchFilter({ collapsed }: SidebarBranchFilterProps) {
  const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
  const { branches, isLoading } = useBranchesPicker();

  const options = useMemo(
    () => [
      { value: "all", label: "All branches" },
      ...branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
    ],
    [branches],
  );

  if (collapsed) {
    return null;
  }

  return (
    <div className="mx-3 mb-2 mt-1">
      <label className="mb-1.5 block px-1 text-[11px] font-medium tracking-wide text-neutral-600 uppercase">
        Branch filter
      </label>
      <Select
        value={selectedBranchId ?? "all"}
        onChange={(value) =>
          setSelectedBranchId(value === "all" ? null : value)
        }
        options={options}
        placeholder={isLoading ? "Loading branches…" : "All branches"}
        disabled={isLoading}
        aria-label="Filter by branch"
      />
    </div>
  );
}
