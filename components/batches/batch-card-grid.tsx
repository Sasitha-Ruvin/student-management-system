"use client";

import type { BatchListItem } from "@/types/api/batch";

import { BatchCard } from "./batch-card";

type BatchCardGridProps = {
  batches: BatchListItem[];
  currency?: string;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingBatchId?: string | null;
};

export function BatchCardGrid({
  batches,
  currency,
  onNavigate,
  onPrefetch,
  navigatingBatchId = null,
}: BatchCardGridProps) {
  if (batches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 bg-tertiary-100/50 px-4 py-12 text-center text-neutral-600">
        No batches match your filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {batches.map((batch) => (
        <BatchCard
          key={batch.id}
          batch={batch}
          currency={currency}
          onNavigate={onNavigate}
          onPrefetch={onPrefetch}
          isNavigating={navigatingBatchId === batch.id}
        />
      ))}
    </div>
  );
}
