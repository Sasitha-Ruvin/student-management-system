"use client";

import { useMemo, useState } from "react";

import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { useBranchNavigation } from "@/hooks/use-branch-navigation";
import {
  PAGE_SIZE_CARDS,
  PAGE_SIZE_TABLE,
  useBranchFilters,
} from "@/hooks/use-branch-filters";
import { useBranches } from "@/hooks/use-branches";
import { useMediaQuery } from "@/hooks/use-media-query";
import { deactivationBlockedMessage } from "@/lib/branches/deactivation-messages";
import { updateBranch } from "@/lib/api/branches";
import type { BranchListItemDto } from "@/types/api/branch";
import {
  BranchListSkeleton,
  InlineLoader,
  StatsRowSkeleton,
} from "@/components/ui/loading-state";

import { AddBranchModal } from "./add-branch-modal";
import { BranchCardGrid } from "./branch-card-grid";
import { BranchPageHeader } from "./branch-page-header";
import { BranchPagination } from "./branch-pagination";
import { BranchStatsRow } from "./branch-stats-row";
import { BranchTable } from "./branch-table";
import { BranchToolbar } from "./branch-toolbar";

export function BranchManagementPage() {
  const { reload: reloadPicker } = useBranchesPicker();
  const filters = useBranchFilters();
  const [modalOpen, setModalOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const {
    navigateToBranch,
    prefetchBranch,
    navigatingBranchId,
  } = useBranchNavigation();

  const pageSize =
    isMobile || filters.view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;

  const listQuery = useMemo(
    () => ({
      page: filters.page,
      limit: pageSize,
      search: filters.search,
      status: filters.status,
      sort: filters.sortKey,
    }),
    [
      filters.page,
      pageSize,
      filters.search,
      filters.status,
      filters.sortKey,
    ],
  );

  const {
    branches,
    summary,
    total,
    totalPages,
    isLoading,
    isRefreshing,
    error,
    addBranch,
    reload,
  } = useBranches(listQuery);

  const showCards = isMobile || filters.view === "cards";
  const isInitialLoad = isLoading && branches.length === 0;

  function handleEdit(id: string) {
    navigateToBranch(id, { focus: "profile" });
  }

  async function handleDeactivate(branch: BranchListItemDto) {
    if (branch.activeStudentCount > 0) {
      alert(deactivationBlockedMessage(branch.activeStudentCount));
      return;
    }
    if (
      !confirm(
        `Deactivate ${branch.name}? It will be hidden from branch pickers.`,
      )
    ) {
      return;
    }
    setDeactivatingId(branch.id);
    try {
      await updateBranch(branch.id, { isActive: false });
      await reload({ silent: true });
      await reloadPicker();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to deactivate branch");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <BranchPageHeader
        activeCount={summary.activeBranchCount}
        studentCount={summary.totalStudents}
        onAdd={() => setModalOpen(true)}
      />

      {isInitialLoad ? (
        <StatsRowSkeleton />
      ) : (
        <BranchStatsRow stats={summary} />
      )}

      <BranchToolbar
        search={filters.search}
        setSearch={filters.setSearch}
        status={filters.status}
        setStatus={filters.setStatus}
        sortKey={filters.sortKey}
        setSortKey={filters.setSortKey}
        view={filters.view}
        setView={filters.setView}
        totalCount={total}
      />

      <section aria-label="Branch list" className="relative space-y-4">
        {isRefreshing ? (
          <div className="absolute top-0 right-0 z-10">
            <InlineLoader label="Updating…" />
          </div>
        ) : null}

        {isInitialLoad ? (
          <BranchListSkeleton variant={showCards ? "cards" : "table"} />
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : showCards ? (
          <BranchCardGrid
            branches={branches}
            onDeactivate={handleDeactivate}
            onEdit={handleEdit}
            onNavigate={navigateToBranch}
            onPrefetch={prefetchBranch}
            navigatingBranchId={navigatingBranchId}
            deactivatingBranchId={deactivatingId}
          />
        ) : (
          <BranchTable
            branches={branches}
            onDeactivate={handleDeactivate}
            onEdit={handleEdit}
            onNavigate={navigateToBranch}
            onPrefetch={prefetchBranch}
            navigatingBranchId={navigatingBranchId}
            deactivatingBranchId={deactivatingId}
          />
        )}
      </section>

      <BranchPagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={filters.setPage}
      />

      <AddBranchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          const created = await addBranch(data);
          await reloadPicker();
          navigateToBranch(created.id);
        }}
      />
    </div>
  );
}
