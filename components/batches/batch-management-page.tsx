"use client";

import { useMemo, useState } from "react";

import {
  BatchListSkeleton,
  BatchStatsRowSkeleton,
  InlineLoader,
} from "@/components/ui/loading-state";
import {
  PAGE_SIZE_CARDS,
  PAGE_SIZE_TABLE,
  useBatchFilters,
} from "@/hooks/use-batch-filters";
import { useBatchNavigation } from "@/hooks/use-batch-navigation";
import { useBatches } from "@/hooks/use-batches";
import { useMediaQuery } from "@/hooks/use-media-query";

import { BatchCardGrid } from "./batch-card-grid";
import { BatchPageHeader } from "./batch-page-header";
import { BatchPagination } from "./batch-pagination";
import { BatchStatsRow } from "./batch-stats-row";
import { BatchTable } from "./batch-table";
import { BatchToolbar } from "./batch-toolbar";
import { CreateBatchModal } from "./create-batch-modal";

export function BatchManagementPage() {
  const filters = useBatchFilters();
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { navigateToBatch, prefetchBatch, navigatingBatchId } = useBatchNavigation();

  const pageSize =
    isMobile || filters.view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;

  const listQuery = useMemo(
    () => ({
      page: filters.page,
      limit: pageSize,
      search: filters.search,
      branchId: filters.branchId === "all" ? undefined : filters.branchId,
      status: filters.status,
    }),
    [filters.page, pageSize, filters.search, filters.branchId, filters.status],
  );

  const {
    batches,
    summary,
    total,
    totalPages,
    isLoading,
    isRefreshing,
    error,
    addBatch,
    reload,
  } = useBatches(listQuery);

  const showCards = isMobile || filters.view === "cards";
  const isInitialLoad = isLoading && batches.length === 0;

  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <BatchPageHeader
        batchCount={summary.activeBatchCount}
        studentCount={summary.totalStudents}
        onCreate={() => setModalOpen(true)}
      />

      {isInitialLoad ? (
        <BatchStatsRowSkeleton />
      ) : (
        <BatchStatsRow stats={summary} />
      )}

      <BatchToolbar
        search={filters.search}
        setSearch={filters.setSearch}
        branchId={filters.branchId}
        setBranchId={filters.setBranchId}
        status={filters.status}
        setStatus={filters.setStatus}
        view={filters.view}
        setView={filters.setView}
        totalCount={total}
      />

      <section aria-label="Batch list" className="relative space-y-4">
        {isRefreshing ? (
          <div className="absolute top-0 right-0 z-10">
            <InlineLoader label="Updating…" />
          </div>
        ) : null}

        {isInitialLoad ? (
          <BatchListSkeleton variant={showCards ? "cards" : "table"} />
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : showCards ? (
          <BatchCardGrid
            batches={batches}
            onNavigate={navigateToBatch}
            onPrefetch={prefetchBatch}
            navigatingBatchId={navigatingBatchId}
          />
        ) : (
          <BatchTable
            batches={batches}
            onNavigate={navigateToBatch}
            onPrefetch={prefetchBatch}
            navigatingBatchId={navigatingBatchId}
          />
        )}
      </section>

      <BatchPagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={filters.setPage}
      />

      <CreateBatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addBatch}
        onViewBatch={navigateToBatch}
      />
    </div>
  );
}
