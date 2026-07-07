"use client";

import { Select } from "@/components/ui/select";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import type { BatchStatusFilter, BatchViewMode } from "@/hooks/use-batch-filters";
import { LayoutGrid, Search, SlidersHorizontal, Table2 } from "@/lib/icons";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "OPEN", label: "Registration open" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

type BatchToolbarProps = {
  search: string;
  setSearch: (v: string) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  status: BatchStatusFilter;
  setStatus: (v: BatchStatusFilter) => void;
  view: BatchViewMode;
  setView: (v: BatchViewMode) => void;
  totalCount: number;
};

export function BatchToolbar({
  search,
  setSearch,
  branchId,
  setBranchId,
  status,
  setStatus,
  view,
  setView,
  totalCount,
}: BatchToolbarProps) {
  const { branches, isLoading } = useBranchesPicker();

  const branchOptions = [
    { value: "all", label: "All branches" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <div className="relative z-10 space-y-3 rounded-2xl border border-secondary-300/40 bg-background p-3 sm:border-0 sm:bg-transparent sm:p-0 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search batches…"
          className="min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 py-2.5 pr-3 pl-10 text-base outline-none focus:border-primary-900 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <div className="flex min-w-0 items-center gap-1 rounded-xl border border-secondary-400 bg-tertiary-100 py-1 pr-2 pl-3">
          <SlidersHorizontal className="size-4 shrink-0 text-neutral-600" aria-hidden />
          <Select
            variant="ghost"
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            aria-label="Filter by branch"
            className="min-w-0 flex-1"
            disabled={isLoading}
          />
        </div>

        <Select
          value={status}
          onChange={(v) => setStatus(v as BatchStatusFilter)}
          options={STATUS_OPTIONS}
          aria-label="Filter by status"
          className="min-w-0"
        />

        <span className="col-span-2 text-center text-sm text-neutral-600 sm:col-span-1 sm:text-left">
          {totalCount} result{totalCount !== 1 ? "s" : ""}
        </span>

        <div className="col-span-2 hidden rounded-xl border border-secondary-400 bg-tertiary-100 p-1 md:col-span-1 md:flex">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={[
              "flex size-10 items-center justify-center rounded-lg transition-colors sm:size-11",
              view === "cards"
                ? "bg-primary-900 text-tertiary-100"
                : "text-neutral-700 hover:bg-secondary-200",
            ].join(" ")}
            aria-label="Card view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={[
              "flex size-10 items-center justify-center rounded-lg transition-colors sm:size-11",
              view === "table"
                ? "bg-primary-900 text-tertiary-100"
                : "text-neutral-700 hover:bg-secondary-200",
            ].join(" ")}
            aria-label="Table view"
          >
            <Table2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
