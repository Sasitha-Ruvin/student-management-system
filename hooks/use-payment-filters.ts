"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchBatches } from "@/lib/api/batches";
import { branchIdForToolbar, useBranchFilter } from "@/stores/branch-filter-store";
import type { InstallmentStatus } from "@/types/api/payment";
import type { BatchListItem } from "@/types/api/batch";

export type InstallmentStatusFilter = InstallmentStatus | "all";

export function usePaymentFilters() {
  const { selectedBranchId } = useBranchFilter();
  const branchId = branchIdForToolbar(selectedBranchId);

  const [batchId, setBatchIdState] = useState("");
  const [status, setStatusState] = useState<InstallmentStatusFilter>("all");
  const [search, setSearchState] = useState("");
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const page = await fetchBatches({
        limit: 100,
        status: "all",
        branchId: branchId === "all" ? undefined : branchId,
      });
      setBatches(page.items);
      setBatchIdState((prev) => {
        if (prev && page.items.some((b) => b.id === prev)) return prev;
        return page.items[0]?.id ?? "";
      });
    } catch {
      setBatches([]);
      setBatchIdState("");
    } finally {
      setBatchesLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  return {
    branchId,
    selectedBranchId,
    batchId,
    setBatchId: setBatchIdState,
    status,
    setStatus: setStatusState,
    search,
    setSearch: setSearchState,
    batches,
    batchesLoading,
    reloadBatches: loadBatches,
  };
}
