"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSessionBranchNav } from "@/lib/api/sessions";
import type { SessionTab } from "@/lib/sessions/session-tab-filter";
import type { SessionBranchNavItem } from "@/types/api/batch";

export function useSessionBranchNav(tab: SessionTab, search: string, enabled: boolean) {
  const [items, setItems] = useState<SessionBranchNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchSessionBranchNav(tab, search));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load branches");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab, search, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, isLoading, error, reload: load };
}
