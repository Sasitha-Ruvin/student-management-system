"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchAttendanceGrid,
  fetchBatchDetail,
  fetchBatchFinance,
  fetchBatchSessions,
  fetchBatchStudents,
  updateBatch,
} from "@/lib/api/batches";
import type {
  AttendanceGrid,
  BatchDetail,
  BatchFinanceSummary,
  BatchSessionRow,
  BatchStudentRow,
  UpdateBatchBody,
} from "@/types/api/batch";

function useAbortLoad<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
): {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
  }, [fetcher, enabled]);

  useEffect(() => {
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return { data, isLoading, error, reload: load };
}

export function useBatchDetail(batchId: string) {
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchBatchDetail(batchId);
      if (!controller.signal.aborted) setDetail(result);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "Failed to load batch");
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
    return () => { abortRef.current?.abort(); };
  }, [load]);

  async function saveBatch(body: UpdateBatchBody) {
    const result = await updateBatch(batchId, body);
    setDetail(result.batch);
    return result;
  }

  return { detail, isLoading, error, reload: load, saveBatch };
}

export function useBatchStudents(batchId: string, enabled: boolean) {
  const fetcher = useCallback(
    (_signal: AbortSignal) => fetchBatchStudents(batchId),
    [batchId],
  );
  const { data, isLoading, error, reload } = useAbortLoad<BatchStudentRow[]>(
    fetcher,
    enabled,
  );
  return { students: data ?? [], isLoading, error, reload };
}

export function useBatchSessions(batchId: string, enabled: boolean) {
  const fetcher = useCallback(
    (_signal: AbortSignal) => fetchBatchSessions(batchId),
    [batchId],
  );
  const { data, isLoading, error, reload } = useAbortLoad<BatchSessionRow[]>(
    fetcher,
    enabled,
  );
  return { sessions: data ?? [], isLoading, error, reload };
}

export function useBatchAttendance(batchId: string, enabled: boolean) {
  const fetcher = useCallback(
    (_signal: AbortSignal) => fetchAttendanceGrid(batchId),
    [batchId],
  );
  const { data, isLoading, error, reload } = useAbortLoad<AttendanceGrid>(
    fetcher,
    enabled,
  );
  return { grid: data, isLoading, error, reload };
}

export function useBatchFinance(batchId: string, enabled: boolean) {
  const fetcher = useCallback(
    (_signal: AbortSignal) => fetchBatchFinance(batchId),
    [batchId],
  );
  const { data, isLoading, error, reload } = useAbortLoad<BatchFinanceSummary>(
    fetcher,
    enabled,
  );
  return { finance: data, isLoading, error, reload };
}
