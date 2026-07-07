"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchAlumni, type AlumniListParams } from "@/lib/api/alumni";
import type { AlumniListItem } from "@/types/api/alumni";

export function useAlumni(params: AlumniListParams) {
  const [items, setItems] = useState<AlumniListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page ?? 1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAlumni(params);
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alumni");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.branchId,
    params.batchId,
    params.search,
    params.page,
    params.limit,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, total, page, totalPages, isLoading, error, reload: load };
}
