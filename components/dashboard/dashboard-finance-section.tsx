"use client";

import { BatchStatsRowSkeleton } from "@/components/ui/loading-state";
import type { DashboardFinance } from "@/types/api/dashboard";

import { DashboardFinanceKpiRow } from "./dashboard-finance-kpi-row";
import { DashboardMonthlyChart } from "./dashboard-monthly-chart";
import { DashboardPaymentOverview } from "./dashboard-payment-overview";

type DashboardFinanceSectionProps = {
  finance: DashboardFinance;
  isLoading?: boolean;
};

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-secondary-300/50 bg-white p-5 shadow-sm">
      <div className="h-5 w-40 animate-pulse rounded bg-secondary-200/70" />
      <div className="mt-6 flex h-36 items-end gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="h-16 w-full animate-pulse rounded-t-lg bg-secondary-200/70" />
            <div className="h-3 w-8 animate-pulse rounded bg-secondary-200/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardFinanceSection({
  finance,
  isLoading,
}: DashboardFinanceSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-headline text-xl text-primary-900 sm:text-2xl">
          Money
        </h2>
        <p className="mt-0.5 text-sm text-neutral-600">
          Payments and fees at a glance
        </p>
      </div>

      {isLoading ? (
        <BatchStatsRowSkeleton />
      ) : (
        <DashboardFinanceKpiRow finance={finance} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <DashboardMonthlyChart
              months={finance.monthlyCollections}
              currency={finance.currency}
            />
            <DashboardPaymentOverview finance={finance} />
          </>
        )}
      </div>
    </section>
  );
}
