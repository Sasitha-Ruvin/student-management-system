"use client";

import { MapPin } from "@/lib/icons";
import type { SessionBranchNavItem } from "@/types/api/batch";
import type { SessionTab } from "@/hooks/use-session-filters";

type SessionBranchGridProps = {
  branches: SessionBranchNavItem[];
  tab: SessionTab;
  onSelect: (branch: SessionBranchNavItem) => void;
};

function sessionCountLabel(count: number, tab: SessionTab) {
  const kind = tab === "upcoming" ? "upcoming" : "completed";
  return `${count} ${kind} session${count === 1 ? "" : "s"}`;
}

export function SessionBranchGrid({
  branches,
  tab,
  onSelect,
}: SessionBranchGridProps) {
  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 px-6 py-16 text-center text-neutral-600">
        No branches match your filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {branches.map((branch) => (
        <button
          key={branch.id}
          type="button"
          onClick={() => onSelect(branch)}
          className="flex w-full flex-col rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 text-left shadow-sm transition-colors hover:border-secondary-400/80 sm:p-5"
        >
          <h2 className="font-headline text-xl text-primary-900 sm:text-2xl">
            {branch.name}
          </h2>
          <p className="mt-1 font-mono text-xs tracking-wide text-neutral-600">
            {branch.branchCode}
          </p>
          <p className="mt-3 flex items-start gap-2 text-sm text-neutral-700">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="break-words">{branch.location}</span>
          </p>
          <p className="mt-4 font-headline text-lg text-primary-900">
            {sessionCountLabel(branch.sessionCount, tab)}
          </p>
        </button>
      ))}
    </div>
  );
}
