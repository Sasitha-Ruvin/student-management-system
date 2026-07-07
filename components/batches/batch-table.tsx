"use client";

import { Spinner } from "@/components/ui/spinner";
import { formatBatchDateRange } from "@/components/batches/batch-date-range";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { formatMoney } from "@/lib/format/money";
import type { BatchListItem } from "@/types/api/batch";

type BatchTableProps = {
  batches: BatchListItem[];
  currency?: string;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingBatchId?: string | null;
};

export function BatchTable({
  batches,
  currency = "LKR",
  onNavigate,
  onPrefetch,
  navigatingBatchId = null,
}: BatchTableProps) {
  if (batches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-secondary-400 bg-tertiary-100/50 px-4 py-12 text-center text-neutral-600">
        No batches match your filters.
      </p>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
      <div className="min-w-[900px] rounded-2xl border border-secondary-300/50 bg-tertiary-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary-300/60 text-[11px] tracking-wide text-neutral-600 uppercase">
              <th className="px-4 py-3 font-medium sm:px-5">Name</th>
              <th className="px-4 py-3 font-medium sm:px-5">Code</th>
              <th className="px-4 py-3 font-medium sm:px-5">Branch</th>
              <th className="px-4 py-3 font-medium sm:px-5">Status</th>
              <th className="px-4 py-3 font-medium sm:px-5">Dates</th>
              <th className="px-4 py-3 font-medium sm:px-5">Students</th>
              <th className="px-4 py-3 font-medium sm:px-5">Sessions</th>
              <th className="px-4 py-3 font-medium sm:px-5">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => {
              const isNavigating = navigatingBatchId === batch.id;
              return (
                <tr
                  key={batch.id}
                  className="border-b border-secondary-300/40 last:border-0 hover:bg-secondary-100/50"
                  onMouseEnter={() => onPrefetch?.(batch.id)}
                >
                  <td className="px-4 py-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onNavigate(batch.id)}
                      disabled={isNavigating}
                      className="inline-flex items-center gap-2 text-left font-headline text-base text-primary-900 hover:underline disabled:opacity-70"
                    >
                      {isNavigating ? (
                        <Spinner className="size-4" label="Opening" />
                      ) : null}
                      {batch.name}
                    </button>
                  </td>
                  <td className="px-4 py-4 font-mono text-sm sm:px-5">
                    {batch.batchCode}
                  </td>
                  <td className="px-4 py-4 text-neutral-700 sm:px-5">
                    {batch.branchName}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <BatchStatusBadge status={batch.status} />
                  </td>
                  <td className="max-w-[200px] px-4 py-4 text-neutral-700 sm:px-5">
                    {formatBatchDateRange(batch.startDate, batch.endDate)}
                  </td>
                  <td className="px-4 py-4 font-headline text-lg sm:px-5">
                    {batch.enrollmentCount}
                    {batch.maxCapacity ? `/${batch.maxCapacity}` : ""}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    {batch.completedSessionCount}/{batch.sessionCount}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    {formatMoney(batch.revenueCollected, currency, {
                      compact: true,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
