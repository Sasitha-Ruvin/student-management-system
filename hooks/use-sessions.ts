"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSessions } from "@/lib/api/sessions";
import type { SessionListPage, SessionListQuery } from "@/types/api/batch";

export function useSessions(query: SessionListQuery, enabled = true) {
  const [data, setData] = useState<SessionListPage | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (initial: boolean) => {
      if (!enabled) return;
      if (initial) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);
      try {
        const result = await fetchSessions(query);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      enabled,
      query.page,
      query.limit,
      query.tab,
      query.branchId,
      query.batchId,
      query.search,
    ],
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void load(true);
  }, [load, enabled]);

  const reload = useCallback(async () => {
    await load(false);
  }, [load]);

  return {
    items: data?.items ?? [],
    summary: data?.summary ?? { activeToday: 0, expectedAttendanceToday: 0 },
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 20,
    totalPages: data ? Math.ceil(data.total / data.limit) : 0,
    isLoading,
    isRefreshing,
    error,
    reload,
  };
}
