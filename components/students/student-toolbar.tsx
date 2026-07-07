"use client";

import { Select } from "@/components/ui/select";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import {
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Table2,
} from "@/lib/icons";
import type {
  StudentListTab,
  StudentSourceFilter,
  StudentStatusFilter,
  StudentViewMode,
} from "@/hooks/use-student-filters";

const ENROLLED_STATUS_OPTIONS = [
  { value: "all", label: "All enrolled status" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DROPPED", label: "Dropped" },
];

const ALL_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "UNASSIGNED", label: "Unassigned" },
  ...ENROLLED_STATUS_OPTIONS.slice(1),
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "WEBSITE", label: "Website" },
  { value: "MANUAL", label: "Manual" },
  { value: "WEBHOOK", label: "Webhook" },
];

type StudentToolbarProps = {
  search: string;
  setSearch: (v: string) => void;
  listTab: StudentListTab;
  enrollmentStatus: StudentStatusFilter;
  setEnrollmentStatus: (v: StudentStatusFilter) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  source: StudentSourceFilter;
  setSource: (v: StudentSourceFilter) => void;
  view: StudentViewMode;
  setView: (v: StudentViewMode) => void;
  totalCount: number;
};

export function StudentToolbar({
  search,
  setSearch,
  listTab,
  enrollmentStatus,
  setEnrollmentStatus,
  branchId,
  setBranchId,
  source,
  setSource,
  view,
  setView,
  totalCount,
}: StudentToolbarProps) {
  const { branches } = useBranchesPicker();
  const branchOptions = [
    { value: "all", label: "All branches" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const statusOptions =
    listTab === "enrolled"
      ? ENROLLED_STATUS_OPTIONS
      : listTab === "all"
        ? ALL_STATUS_OPTIONS
        : null;

  return (
    <div className="relative z-10 space-y-3 rounded-2xl border border-secondary-300/40 bg-background p-3 sm:border-0 sm:bg-transparent sm:p-0 lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, model code, NIC…"
          className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 py-2.5 pr-3 pl-10 text-sm text-primary-900 placeholder:text-neutral-500 focus:border-primary-900 focus:outline-none lg:max-w-md"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions ? (
          <Select
            value={enrollmentStatus}
            onChange={(v) => setEnrollmentStatus(v as StudentStatusFilter)}
            options={statusOptions}
            className="min-w-[140px]"
          />
        ) : null}
        <Select
          value={branchId}
          onChange={setBranchId}
          options={branchOptions}
          className="min-w-[140px]"
        />
        <Select
          value={source}
          onChange={(v) => setSource(v as StudentSourceFilter)}
          options={SOURCE_OPTIONS}
          className="min-w-[120px]"
        />
        <div className="flex rounded-xl border border-secondary-300/60 p-0.5">
          <button
            type="button"
            onClick={() => setView("table")}
            className={[
              "flex min-h-10 min-w-10 items-center justify-center rounded-lg",
              view === "table" ? "bg-primary-900 text-tertiary-100" : "text-neutral-600",
            ].join(" ")}
            aria-label="Table view"
          >
            <Table2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            className={[
              "flex min-h-10 min-w-10 items-center justify-center rounded-lg",
              view === "cards" ? "bg-primary-900 text-tertiary-100" : "text-neutral-600",
            ].join(" ")}
            aria-label="Card view"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
        <span className="hidden items-center gap-1 text-sm text-neutral-600 sm:inline-flex">
          <SlidersHorizontal className="size-4" />
          {totalCount} result{totalCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
