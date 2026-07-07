"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createBranch,
  fetchBranches,
  type BranchListParams,
} from "@/lib/api/branches";
import type {
  BranchListItemDto,
  BranchListPage,
  BranchListSummary,
  CreateBranchBody,
} from "@/types/api/branch";

const EMPTY_SUMMARY: BranchListSummary = {
  activeBranchCount: 0,
  totalStudents: 0,
  activeBatchCount: 0,
};

export function useBranches(query: BranchListParams) {
  const [listPage, setListPage] = useState<BranchListPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        setListPage(await fetchBranches(query));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load branches");
        if (!opts?.silent) setListPage(null);
      } finally {
        if (opts?.silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [query.page, query.limit, query.search, query.status, query.sort],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function addBranch(body: CreateBranchBody) {
    const created = await createBranch(body);
    await load({ silent: true });
    return created;
  }

  const branches: BranchListItemDto[] = listPage?.items ?? [];

  return {
    branches,
    summary: listPage?.summary ?? EMPTY_SUMMARY,
    total: listPage?.total ?? 0,
    totalPages: listPage?.totalPages ?? 1,
    page: listPage?.page ?? query.page ?? 1,
    isLoading,
    isRefreshing,
    error,
    reload: load,
    addBranch,
  };
}
