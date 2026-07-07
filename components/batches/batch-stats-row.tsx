"use client";

import { Banknote, CalendarCheck, Layers, Users } from "@/lib/icons";
import { formatMoney, formatPercent } from "@/lib/format/money";
import type { BatchListSummary } from "@/types/api/batch";

type BatchStatsRowProps = {
  stats: BatchListSummary;
  currency?: string;
};

export function BatchStatsRow({ stats, currency = "LKR" }: BatchStatsRowProps) {
  const items = [
    {
      key: "batches",
      label: "Active Batches",
      value: String(stats.activeBatchCount),
      icon: Layers,
    },
    {
      key: "students",
      label: "Total Students",
      value: String(stats.totalStudents),
      icon: Users,
    },
    {
      key: "attendance",
      label: "Avg. Attendance",
      value: formatPercent(stats.avgAttendancePercent),
      icon: CalendarCheck,
    },
    {
      key: "revenue",
      label: "Revenue Collected",
      value: formatMoney(stats.totalRevenueCollected, currency, {
        compact: true,
      }),
      icon: Banknote,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ key, label, value, icon: Icon }) => (
        <div
          key={key}
          className="flex items-center gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-900">
            <Icon className="size-5 text-tertiary-100" />
          </div>
          <div>
            <p className="font-headline text-2xl text-primary-900 sm:text-3xl">
              {value}
            </p>
            <p className="text-[11px] tracking-wide text-neutral-600 uppercase">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
