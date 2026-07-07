"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchSessionDetail } from "@/lib/api/sessions";
import type { SessionDetail } from "@/types/api/batch";

export function useSessionDetail(sessionId: string) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await fetchSessionDetail(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, isLoading, error, reload: load };
}
