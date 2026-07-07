"use client";

import { useState } from "react";

import type { SessionListQuery } from "@/types/api/batch";

export type SessionTab = "upcoming" | "completed";

export const PAGE_SIZE_SESSIONS = 20;

export function useSessionFilters() {
  const [search, setSearchState] = useState("");
  const [tab, setTabState] = useState<SessionTab>("upcoming");
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
    tab,
    setTab: (v: SessionTab) => {
      setTabState(v);
      resetPage();
    },
    page,
    setPage,
    resetPage,
  };
}
