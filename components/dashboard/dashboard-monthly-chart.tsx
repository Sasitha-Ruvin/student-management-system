"use client";

import { formatMoney } from "@/lib/format/money";
import type { DashboardMonthlyCollection } from "@/types/api/dashboard";

type DashboardMonthlyChartProps = {
  months: DashboardMonthlyCollection[];
  currency: string;
};

export function DashboardMonthlyChart({
  months,
  currency,
}: DashboardMonthlyChartProps) {
  const maxAmount = Math.max(...months.map((m) => m.amount), 1);

  return (
    <div className="rounded-2xl border border-secondary-300/50 bg-white p-5 shadow-sm">
      <h3 className="font-headline text-lg text-primary-900">
        Money received
      </h3>
      <p className="mt-0.5 text-sm text-neutral-600">Last 6 months</p>

      <div
        className="mt-6 flex h-36 items-end justify-between gap-2 sm:gap-3"
        role="img"
        aria-label="Bar chart of money received per month"
      >
        {months.map((month) => {
          const heightPct = Math.max(
            4,
            Math.round((month.amount / maxAmount) * 100),
          );
          return (
            <div
              key={month.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-[10px] text-neutral-500 sm:text-xs">
                {month.amount > 0
                  ? formatMoney(month.amount, currency, { compact: true })
                  : ""}
              </span>
              <div
                className="w-full max-w-12 rounded-t-lg bg-primary-900/85 transition-all"
                style={{ height: `${heightPct}%` }}
                title={`${month.label}: ${formatMoney(month.amount, currency)}`}
              />
              <span className="text-xs font-medium text-neutral-700">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
