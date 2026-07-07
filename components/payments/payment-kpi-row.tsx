"use client";

import { DashboardFinanceKpiRow } from "@/components/dashboard/dashboard-finance-kpi-row";
import type { DashboardFinance } from "@/types/api/dashboard";

type PaymentKpiRowProps = {
  finance: DashboardFinance | null;
  isLoading: boolean;
};

export function PaymentKpiRow({ finance, isLoading }: PaymentKpiRowProps) {
  if (isLoading || !finance) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-secondary-300/50 bg-white"
          />
        ))}
      </div>
    );
  }

  return <DashboardFinanceKpiRow finance={finance} />;
}
