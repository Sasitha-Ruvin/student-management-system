"use client";

import { Search, UserPlus } from "@/lib/icons";
import { Select } from "@/components/ui/select";
import type { BatchListItem } from "@/types/api/batch";

type AlumniToolbarProps = {
  batchId: string;
  setBatchId: (v: string) => void;
  batches: BatchListItem[];
  batchesLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  totalCount: number;
  onAddClick: () => void;
};

export function AlumniToolbar({
  batchId,
  setBatchId,
  batches,
  batchesLoading,
  search,
  setSearch,
  totalCount,
  onAddClick,
}: AlumniToolbarProps) {
  const batchOptions = [
    { value: "all", label: "All batches" },
    ...batches.map((b) => ({
      value: b.id,
      label: `${b.batchCode} — ${b.name}`,
    })),
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-secondary-300/40 bg-background p-3 sm:border-0 sm:bg-transparent sm:p-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, NIC, or model code…"
            className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 py-2.5 pr-3 pl-10 text-sm text-primary-900 placeholder:text-neutral-500 focus:border-primary-900 focus:outline-none lg:max-w-md"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-neutral-600">
            <span className="font-medium text-primary-900">{totalCount}</span>{" "}
            alumni
          </p>
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100"
          >
            <UserPlus className="size-4" aria-hidden />
            Add alumni
          </button>
        </div>
      </div>

      <div className="min-w-[200px] max-w-xs">
        <span className="mb-1 block text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
          Batch
        </span>
        <Select
          value={batchId}
          onChange={setBatchId}
          options={batchOptions}
          placeholder={batchesLoading ? "Loading batches…" : "All batches"}
          disabled={batchesLoading}
          aria-label="Filter by batch"
        />
      </div>
    </div>
  );
}
