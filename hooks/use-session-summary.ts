"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSessions } from "@/lib/api/sessions";
import type { SessionTab } from "@/lib/sessions/session-tab-filter";
import type { SessionListSummary } from "@/types/api/batch";

const EMPTY_SUMMARY: SessionListSummary = {
  activeToday: 0,
  expectedAttendanceToday: 0,
};

export function useSessionSummary(
  tab: SessionTab,
  branchId?: string | null,
) {
  const [summary, setSummary] = useState<SessionListSummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    try {
      const result = await fetchSessions({
        page: 1,
        limit: 1,
        tab,
        branchId: branchId ?? undefined,
      });
      setSummary(result.summary);
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, [tab, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  return summary;
}
