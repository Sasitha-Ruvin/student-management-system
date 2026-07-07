"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

export function useBranchNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingId(null);
  }, [pathname]);

  const prefetchBranch = useCallback(
    (branchId: string) => {
      router.prefetch(`/dashboard/branches/${branchId}`);
    },
    [router],
  );

  const navigateToBranch = useCallback(
    (
      branchId: string,
      options?: { focus?: "profile" },
    ) => {
      setPendingId(branchId);
      const query =
        options?.focus === "profile" ? "?focus=profile" : "";
      const href = `/dashboard/branches/${branchId}${query}`;
      router.prefetch(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [router],
  );

  return {
    navigateToBranch,
    prefetchBranch,
    navigatingBranchId: isPending ? pendingId : null,
    isNavigating: isPending,
  };
}
