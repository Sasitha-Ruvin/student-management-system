"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchInstallments } from "@/lib/api/payments";
import type { InstallmentListItem } from "@/types/api/payment";

type UseInstallmentsParams = {
  batchId: string;
  branchId: string;
  status: string;
  search: string;
  page?: number;
  limit?: number;
};

export function useInstallments(params: UseInstallmentsParams) {
  const [items, setItems] = useState<InstallmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page ?? 1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.batchId) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchInstallments({
        batchId: params.batchId,
        branchId: params.branchId === "all" ? undefined : params.branchId,
        status: params.status === "all" ? undefined : params.status,
        search: params.search || undefined,
        page: params.page,
        limit: params.limit,
      });
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load instalments");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.batchId,
    params.branchId,
    params.status,
    params.search,
    params.page,
    params.limit,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, total, page, totalPages, isLoading, error, reload: load };
}
