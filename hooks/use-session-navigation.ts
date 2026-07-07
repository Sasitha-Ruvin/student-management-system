"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

export function useSessionNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingId(null);
  }, [pathname]);

  const prefetchSession = useCallback(
    (sessionId: string) => {
      router.prefetch(`/dashboard/sessions/${sessionId}`);
    },
    [router],
  );

  const navigateToSession = useCallback(
    (sessionId: string) => {
      setPendingId(sessionId);
      prefetchSession(sessionId);
      startTransition(() => {
        router.push(`/dashboard/sessions/${sessionId}`);
      });
    },
    [prefetchSession, router],
  );

  return {
    navigateToSession,
    prefetchSession,
    navigatingSessionId: isPending ? pendingId : null,
    isNavigating: isPending,
  };
}
