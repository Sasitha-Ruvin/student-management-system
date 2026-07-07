"use client";

import type { SessionListSummary } from "@/types/api/batch";

type SessionStatsStripProps = {
  summary: SessionListSummary;
};

export function SessionStatsStrip({ summary }: SessionStatsStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <div className="rounded-xl border border-secondary-300/50 bg-tertiary-100 px-4 py-3 shadow-sm">
        <p className="text-xs text-neutral-600">Active sessions today</p>
        <p className="font-headline mt-0.5 text-2xl text-primary-900">
          {String(summary.activeToday).padStart(2, "0")}
        </p>
      </div>
      <div className="rounded-xl border border-secondary-300/50 bg-tertiary-100 px-4 py-3 shadow-sm">
        <p className="text-xs text-neutral-600">Expected attendance</p>
        <p className="font-headline mt-0.5 text-2xl text-primary-900">
          {summary.expectedAttendanceToday}
        </p>
      </div>
    </div>
  );
}
