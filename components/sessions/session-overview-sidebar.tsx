"use client";

import type { SessionListSummary } from "@/types/api/batch";

type SessionOverviewSidebarProps = {
  summary: SessionListSummary;
};

export function SessionOverviewSidebar({ summary }: SessionOverviewSidebarProps) {
  return (
    <aside className="space-y-4">
      <h2 className="text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
        Today&apos;s overview
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm">
          <p className="text-xs text-neutral-600">Active sessions</p>
          <p className="font-headline mt-1 text-4xl text-primary-900">
            {String(summary.activeToday).padStart(2, "0")}
          </p>
        </div>
        <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm">
          <p className="text-xs text-neutral-600">Expected attendance</p>
          <p className="font-headline mt-1 text-4xl text-primary-900">
            {summary.expectedAttendanceToday}
          </p>
        </div>
      </div>
    </aside>
  );
}

