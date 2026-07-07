"use client";

import { BranchFilterChip } from "@/components/ui/branch-filter-chip";
import { Layers, Plus } from "@/lib/icons";

type BatchPageHeaderProps = {
  batchCount: number;
  studentCount: number;
  onCreate: () => void;
};

export function BatchPageHeader({
  batchCount,
  studentCount,
  onCreate,
}: BatchPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary-300/80">
          <Layers className="size-5 text-primary-900" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-primary-900 md:text-3xl">
            Batch & Intake Management
          </h1>
          <p className="mt-0.5 text-sm text-neutral-700">
            {batchCount} batch{batchCount !== 1 ? "es" : ""} · {studentCount}{" "}
            enrolled student{studentCount !== 1 ? "s" : ""}
          </p>
          <BranchFilterChip className="mt-2" />
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-medium text-tertiary-100 transition-opacity hover:opacity-90 active:opacity-80 sm:w-auto sm:py-2.5"
      >
        <Plus className="size-4" />
        Create Batch
      </button>
    </header>
  );
}
