"use client";

import { useCallback, useEffect, useState } from "react";

import { createBatch, fetchBatches, type BatchListParams } from "@/lib/api/batches";
import type { BatchListPage, BatchListSummary, CreateBatchBody } from "@/types/api/batch";

const EMPTY_SUMMARY: BatchListSummary = {
  activeBatchCount: 0,
  totalStudents: 0,
  avgAttendancePercent: null,
  totalRevenueCollected: 0,
};

export function useBatches(query: BatchListParams) {
  const [listPage, setListPage] = useState<BatchListPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        setListPage(await fetchBatches(query));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load batches");
        if (!opts?.silent) setListPage(null);
      } finally {
        if (opts?.silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [query.page, query.limit, query.branchId, query.status, query.search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function addBatch(body: CreateBatchBody) {
    const result = await createBatch(body);
    await load({ silent: true });
    return result;
  }

  return {
    batches: listPage?.items ?? [],
    summary: listPage?.summary ?? EMPTY_SUMMARY,
    total: listPage?.total ?? 0,
    totalPages: listPage?.totalPages ?? 1,
    page: listPage?.page ?? query.page ?? 1,
    isLoading,
    isRefreshing,
    error,
    reload: load,
    addBatch,
  };
}
