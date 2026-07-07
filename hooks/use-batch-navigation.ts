"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

export function useBatchNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingId(null);
  }, [pathname]);

  const prefetchBatch = useCallback(
    (batchId: string) => {
      router.prefetch(`/dashboard/batches/${batchId}`);
    },
    [router],
  );

  const navigateToBatch = useCallback(
    (batchId: string) => {
      setPendingId(batchId);
      prefetchBatch(batchId);
      startTransition(() => {
        router.push(`/dashboard/batches/${batchId}`);
      });
    },
    [prefetchBatch, router],
  );

  return {
    navigateToBatch,
    prefetchBatch,
    navigatingBatchId: isPending ? pendingId : null,
    isNavigating: isPending,
  };
}
