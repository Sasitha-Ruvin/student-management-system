"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { fetchBatches } from "@/lib/api/batches";
import { branchIdForToolbar, useBranchFilter } from "@/stores/branch-filter-store";
import type { BatchListItem } from "@/types/api/batch";

export function useAlumniFilters() {
  const searchParams = useSearchParams();
  const { selectedBranchId } = useBranchFilter();
  const branchId = branchIdForToolbar(selectedBranchId);

  const [batchId, setBatchIdState] = useState(
    () => searchParams.get("batchId") ?? "all",
  );
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
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  return {
    branchId,
    batchId,
    setBatchId: setBatchIdState,
    search,
    setSearch: setSearchState,
    batches,
    batchesLoading,
    reloadBatches: loadBatches,
  };
}
