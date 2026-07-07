"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchBatchPaymentHistory } from "@/lib/api/payments";
import type { PaymentHistoryItem } from "@/types/api/payment";

export function useBatchPaymentHistory(batchId: string, page = 1) {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!batchId || batchId === "all") {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchBatchPaymentHistory(batchId, page, 20);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [batchId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, total, totalPages, isLoading, error, reload: load };
}
