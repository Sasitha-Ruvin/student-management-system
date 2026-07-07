"use client";

import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { CalendarCheck, Tag } from "@/lib/icons";
import type { SessionBatchNavItem } from "@/types/api/batch";
import type { SessionTab } from "@/hooks/use-session-filters";

type SessionBatchGridProps = {
  batches: SessionBatchNavItem[];
  tab: SessionTab;
  onSelect: (batch: SessionBatchNavItem) => void;
};

function sessionCountLabel(count: number, tab: SessionTab) {
  if (count === 0) {
    return tab === "upcoming" ? "No upcoming sessions" : "No completed sessions";
  }
  const kind = tab === "upcoming" ? "upcoming" : "completed";
  return `${count} ${kind} session${count === 1 ? "" : "s"}`;
}

export function SessionBatchGrid({
  batches,
  tab,
  onSelect,
}: SessionBatchGridProps) {
  if (batches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 px-6 py-16 text-center text-neutral-600">
        No batches match your filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {batches.map((batch) => (
        <button
          key={batch.id}
          type="button"
          onClick={() => onSelect(batch)}
          className="flex w-full flex-col rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 text-left shadow-sm transition-colors hover:border-secondary-400/80 sm:p-5"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-headline text-xl text-primary-900 sm:text-2xl">
              {batch.name}
            </h2>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-600">
            <Tag className="size-3.5" aria-hidden />
            {batch.batchCode}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-neutral-700">
            <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
            {sessionCountLabel(batch.sessionCount, tab)}
          </p>
        </button>
      ))}
    </div>
  );
}
