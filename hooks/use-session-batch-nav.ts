"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSessionBatchNav } from "@/lib/api/sessions";
import type { SessionTab } from "@/lib/sessions/session-tab-filter";
import type { SessionBatchNavItem } from "@/types/api/batch";

export function useSessionBatchNav(
  branchId: string | null,
  tab: SessionTab,
  search: string,
  enabled: boolean,
) {
  const [items, setItems] = useState<SessionBatchNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !branchId) return;
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchSessionBatchNav(branchId, tab, search));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, tab, search, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, isLoading, error, reload: load };
}
