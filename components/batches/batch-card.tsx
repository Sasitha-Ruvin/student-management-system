"use client";

import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatBatchDateRange } from "@/components/batches/batch-date-range";
import { BatchProgressBar } from "@/components/batches/batch-progress-bar";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { formatMoney } from "@/lib/format/money";
import { Building2, CalendarCheck, Eye, Tag } from "@/lib/icons";
import type { BatchListItem } from "@/types/api/batch";

type BatchCardProps = {
  batch: BatchListItem;
  currency?: string;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  isNavigating?: boolean;
};

export function BatchCard({
  batch,
  currency = "LKR",
  onNavigate,
  onPrefetch,
  isNavigating = false,
}: BatchCardProps) {
  const enrollmentTotal = batch.maxCapacity ?? Math.max(batch.enrollmentCount, 1);
  const sessionsLeft = Math.max(0, batch.sessionCount - batch.completedSessionCount);

  return (
    <article className="relative flex w-full flex-col rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm sm:p-5">
      <LoadingOverlay show={isNavigating} label={`Opening ${batch.name}`} />

      <header className="mb-4 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-headline text-xl leading-tight text-primary-900 sm:text-2xl">
              {batch.name}
            </h2>
            <BatchStatusBadge status={batch.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3.5" aria-hidden />
              {batch.batchCode}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" aria-hidden />
              {batch.branchName}
            </span>
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-700">
            <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
            {formatBatchDateRange(batch.startDate, batch.endDate)}
          </p>
        </div>
        <div
          className="relative z-30 shrink-0"
          data-action-menu
          onClick={(e) => e.stopPropagation()}
        >
          <ActionMenu triggerLabel={`Actions for ${batch.name}`}>
            <ActionMenuItem onClick={() => onNavigate(batch.id)}>
              View details
            </ActionMenuItem>
          </ActionMenu>
        </div>
      </header>

      <div className="mb-4 space-y-3">
        <BatchProgressBar
          label="Student enrollment"
          current={batch.enrollmentCount}
          total={enrollmentTotal}
        />
        <BatchProgressBar
          label="Session progress"
          current={batch.completedSessionCount}
          total={batch.sessionCount || batch.totalSessions}
        />
        <BatchProgressBar
          label="Payment collection"
          current={batch.revenueCollected}
          total={batch.revenueExpected || 1}
          formatValue={(c, t) =>
            `${formatMoney(c, currency, { compact: true })}/${formatMoney(t, currency, { compact: true })}`
          }
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-secondary-300/50 bg-secondary-100/40 px-3 py-2.5">
          <p className="text-[10px] tracking-wide text-neutral-600 uppercase">
            Attendance
          </p>
          <p className="font-headline text-2xl text-primary-900">
            {batch.attendancePercent !== null ? `${batch.attendancePercent}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-secondary-300/50 bg-secondary-100/40 px-3 py-2.5">
          <p className="text-[10px] tracking-wide text-neutral-600 uppercase">
            Sessions left
          </p>
          <p className="font-headline text-2xl text-primary-900">{sessionsLeft}</p>
        </div>
      </div>

      <footer className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={() => onNavigate(batch.id)}
          onMouseEnter={() => onPrefetch?.(batch.id)}
          disabled={isNavigating}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100 disabled:opacity-70"
        >
          <Eye className="size-4" />
          View details
        </button>
      </footer>
    </article>
  );
}
