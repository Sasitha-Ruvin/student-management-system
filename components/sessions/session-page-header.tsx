"use client";

import { BranchFilterChip } from "@/components/ui/branch-filter-chip";
import { Plus } from "@/lib/icons";

type SessionPageHeaderProps = {
  onSchedule: () => void;
};

export function SessionPageHeader({ onSchedule }: SessionPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
          Master schedule
        </p>
        <h1 className="font-headline text-3xl text-primary-900 md:text-4xl">
          Session Management
        </h1>
        <BranchFilterChip className="mt-2" />
      </div>
      <button
        type="button"
        onClick={onSchedule}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-medium text-tertiary-100 transition-opacity hover:opacity-90 sm:w-auto"
      >
        <Plus className="size-4" />
        Schedule session
      </button>
    </header>
  );
}
