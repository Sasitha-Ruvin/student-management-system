"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchStudents,
  type StudentListParams,
} from "@/lib/api/students";
import type { StudentListPage } from "@/types/api/student";

export function useStudents(query: StudentListParams) {
  const [listPage, setListPage] = useState<StudentListPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const page = await fetchStudents(query);
        if (!controller.signal.aborted) {
          setListPage(page);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load students");
        if (!opts?.silent) setListPage(null);
      } finally {
        if (!controller.signal.aborted) {
          if (opts?.silent) {
            setIsRefreshing(false);
          } else {
            setIsLoading(false);
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      query.page,
      query.limit,
      query.search,
      query.listTab,
      query.enrollmentStatus,
      query.branchId,
      query.source,
    ],
  );

  useEffect(() => {
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return {
    students: listPage?.items ?? [],
    total: listPage?.total ?? 0,
    totalPages: listPage?.totalPages ?? 1,
    page: listPage?.page ?? query.page ?? 1,
    isLoading,
    isRefreshing,
    error,
    reload: load,
  };
}

/** Lightweight pending count for tab badge (respects branch/source filters). */
export function useStudentPendingCount(filters: {
  branchId?: string;
  source?: StudentListParams["source"];
}) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchStudents({
      listTab: "pending",
      page: 1,
      limit: 1,
      branchId: filters.branchId,
      source: filters.source,
    })
      .then((page) => {
        if (!cancelled) setPendingCount(page.total);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.branchId, filters.source]);

  return pendingCount;
}
