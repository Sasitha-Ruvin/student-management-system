"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

export function useStudentNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingId(null);
  }, [pathname]);

  const prefetchStudent = useCallback(
    (studentId: string) => {
      router.prefetch(`/dashboard/students/${studentId}`);
    },
    [router],
  );

  const navigateToStudent = useCallback(
    (studentId: string) => {
      setPendingId(studentId);
      prefetchStudent(studentId);
      startTransition(() => {
        router.push(`/dashboard/students/${studentId}`);
      });
    },
    [prefetchStudent, router],
  );

  return {
    navigateToStudent,
    prefetchStudent,
    navigatingStudentId: isPending ? pendingId : null,
    isNavigating: isPending,
  };
}
