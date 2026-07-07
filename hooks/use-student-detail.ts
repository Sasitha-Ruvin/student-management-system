"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { loadStudentDetailForAdmin } from "@/app/actions/load-student-detail";
import type { StudentDetail } from "@/types/api/student";

/** Prefer server-rendered initialDetail on the detail page; this hook is for rare client-only reloads. */
export function useStudentDetail(
  studentId: string,
  initialDetail?: StudentDetail,
) {
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetail | null>(
    initialDetail ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialDetail);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDetail) {
      setDetail(initialDetail);
      setIsLoading(false);
    }
  }, [initialDetail]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await loadStudentDetailForAdmin(studentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load student");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!initialDetail) {
      void load();
    }
  }, [initialDetail, load]);

  const reload = useCallback(() => {
    router.refresh();
    if (!initialDetail) {
      void load();
    }
  }, [router, initialDetail, load]);

  return { detail, isLoading, error, reload };
}
