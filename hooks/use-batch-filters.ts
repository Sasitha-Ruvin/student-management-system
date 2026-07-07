"use client";

import { useState } from "react";

import {
  branchIdForToolbar,
  setBranchFromToolbar,
  useBranchFilter,
} from "@/stores/branch-filter-store";

export type BatchViewMode = "cards" | "table";
export type BatchStatusFilter = "all" | "OPEN" | "ACTIVE" | "COMPLETED";

export const PAGE_SIZE_CARDS = 6;
export const PAGE_SIZE_TABLE = 8;

export function useBatchFilters() {
  const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<BatchStatusFilter>("all");
  const [view, setViewState] = useState<BatchViewMode>("cards");
  const [page, setPage] = useState(1);

  const branchId = branchIdForToolbar(selectedBranchId);

  function resetPage() {
    setPage(1);
  }

  return {
    search,
    setSearch: (v: string) => {
      setSearchState(v);
      resetPage();
    },
    branchId,
    setBranchId: (v: string) => {
      setBranchFromToolbar(v, setSelectedBranchId);
      resetPage();
    },
    selectedBranchId,
    status,
    setStatus: (v: BatchStatusFilter) => {
      setStatusState(v);
      resetPage();
    },
    view,
    setView: (v: BatchViewMode) => {
      setViewState(v);
      resetPage();
    },
    page,
    setPage,
  };
}
