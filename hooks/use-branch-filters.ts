"use client";

import { useState } from "react";

export type BranchViewMode = "cards" | "table";
export type BranchStatusFilter = "all" | "active" | "inactive";
export type BranchSortKey = "name" | "students" | "batches";

export const PAGE_SIZE_CARDS = 6;
export const PAGE_SIZE_TABLE = 8;

export function useBranchFilters() {
  const [search, setSearchState] = useState("");
  const [status, setStatusState] = useState<BranchStatusFilter>("all");
  const [sortKey, setSortKey] = useState<BranchSortKey>("name");
  const [view, setViewState] = useState<BranchViewMode>("cards");
  const [page, setPage] = useState(1);

  function resetPage() {
    setPage(1);
  }

  return {
    search,
    setSearch: (v: string) => {
      setSearchState(v);
      resetPage();
    },
    status,
    setStatus: (v: BranchStatusFilter) => {
      setStatusState(v);
      resetPage();
    },
    sortKey,
    setSortKey: (v: BranchSortKey) => {
      setSortKey(v);
      resetPage();
    },
    view,
    setView: (v: BranchViewMode) => {
      setViewState(v);
      resetPage();
    },
    page,
    setPage,
  };
}
