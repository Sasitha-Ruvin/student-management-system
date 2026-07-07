"use client";

import { BatchStatsRowSkeleton } from "@/components/ui/loading-state";
import { useBranchFilter } from "@/stores/branch-filter-store";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

import { DashboardFinanceSection } from "./dashboard-finance-section";
import { DashboardKpiRow } from "./dashboard-kpi-row";
import { DashboardQuickActions } from "./dashboard-quick-actions";

export function DashboardHome() {
  const { stats, isLoading, error } = useDashboardStats();
  const { selectedBranchId } = useBranchFilter();
  const { branches } = useBranchesPicker();

  const branchLabel = selectedBranchId
    ? branches.find((b) => b.id === selectedBranchId)?.name
    : null;

  return (
    <div className="space-y-8 pb-4 sm:space-y-10">
      <header>
        <h1 className="font-headline text-3xl text-primary-900 md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-600 sm:text-base">
          {branchLabel
            ? `Showing numbers for ${branchLabel}.`
            : "A quick look at how things are going."}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-700">Overview</h2>
        {isLoading ? (
          <BatchStatsRowSkeleton />
        ) : (
          <DashboardKpiRow stats={stats} />
        )}
      </section>

      <DashboardFinanceSection finance={stats.finance} isLoading={isLoading} />

      <DashboardQuickActions />
    </div>
  );
}
