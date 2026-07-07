"use client";

import { Search } from "@/lib/icons";
import { Select } from "@/components/ui/select";
import type { InstallmentStatusFilter } from "@/hooks/use-payment-filters";
import type { BatchListItem } from "@/types/api/batch";

const STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
];

type PaymentToolbarProps = {
  batchId: string;
  setBatchId: (v: string) => void;
  batches: BatchListItem[];
  batchesLoading: boolean;
  status: InstallmentStatusFilter;
  setStatus: (v: InstallmentStatusFilter) => void;
  search: string;
  setSearch: (v: string) => void;
  totalCount: number;
};

export function PaymentToolbar({
  batchId,
  setBatchId,
  batches,
  batchesLoading,
  status,
  setStatus,
  search,
  setSearch,
  totalCount,
}: PaymentToolbarProps) {
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
            placeholder="Search student name, NIC, or model code…"
            className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 py-2.5 pr-3 pl-10 text-sm text-primary-900 placeholder:text-neutral-500 focus:border-primary-900 focus:outline-none lg:max-w-md"
          />
        </div>
        <p className="text-sm text-neutral-600 lg:shrink-0">
          <span className="font-medium text-primary-900">{totalCount}</span>{" "}
          instalment{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1 sm:max-w-xs">
          <span className="mb-1 block text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
            Batch
          </span>
          <Select
            value={batchId}
            onChange={setBatchId}
            options={batchOptions}
            placeholder={batchesLoading ? "Loading batches…" : "Select batch"}
            disabled={batchesLoading || batchOptions.length === 0}
            aria-label="Select batch"
          />
        </div>
        <div className="min-w-[160px] sm:max-w-[200px]">
          <span className="mb-1 block text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
            Status
          </span>
          <Select
            value={status}
            onChange={(v) => setStatus(v as InstallmentStatusFilter)}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
          />
        </div>
      </div>
    </div>
  );
}
