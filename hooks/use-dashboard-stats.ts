"use client";

import { useCallback, useEffect, useState } from "react";

import { useBranchFilter } from "@/stores/branch-filter-store";
import { fetchDashboardStats } from "@/lib/api/dashboard";
import type { DashboardFinance, DashboardStats } from "@/types/api/dashboard";

const EMPTY_FINANCE: DashboardFinance = {
  currency: "LKR",
  collectedThisMonth: 0,
  stillOwed: 0,
  overdueCount: 0,
  collectionRatePercent: null,
  totalCollected: 0,
  monthlyCollections: [],
};

const EMPTY_STATS: DashboardStats = {
  totalStudents: 0,
  activeBatches: 0,
  sessionsThisWeek: 0,
  unassignedStudents: 0,
  websitePendingApplications: 0,
  finance: EMPTY_FINANCE,
};

export function useDashboardStats() {
  const { selectedBranchId } = useBranchFilter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboardStats(selectedBranchId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, isLoading, error, reload: load };
}
