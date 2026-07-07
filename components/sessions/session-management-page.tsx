"use client";

import { useCallback, useMemo, useState } from "react";

import { InlineLoader } from "@/components/ui/loading-state";
import { BulkRescheduleModal } from "@/components/sessions/bulk-reschedule-modal";
import { EditSessionDetailsModal } from "@/components/sessions/edit-session-details-modal";
import { EditSessionModal } from "@/components/sessions/edit-session-modal";
import { RescheduleSessionModal } from "@/components/sessions/reschedule-session-modal";
import { ScheduleSessionModal } from "@/components/sessions/schedule-session-modal";
import { SessionBatchGrid } from "@/components/sessions/session-batch-grid";
import { SessionBranchGrid } from "@/components/sessions/session-branch-grid";
import { SessionDrillBreadcrumb } from "@/components/sessions/session-drill-breadcrumb";
import { SessionListGrouped } from "@/components/sessions/session-list-grouped";
import { SessionListSkeleton } from "@/components/sessions/session-list-skeleton";
import { SessionNavGridSkeleton } from "@/components/sessions/session-nav-grid-skeleton";
import { SessionPageHeader } from "@/components/sessions/session-page-header";
import { SessionPagination } from "@/components/sessions/session-pagination";
import { SessionPinModal } from "@/components/sessions/session-pin-modal";
import { SessionStatsStrip } from "@/components/sessions/session-stats-strip";
import { SessionStatusConfirmModal } from "@/components/sessions/session-status-confirm-modal";
import { SessionToolbar } from "@/components/sessions/session-toolbar";
import type { SessionMenuAction } from "@/components/sessions/session-action-menu";
import {
  PAGE_SIZE_SESSIONS,
  useSessionFilters,
} from "@/hooks/use-session-filters";
import { useSessionBatchNav } from "@/hooks/use-session-batch-nav";
import { useSessionBranchNav } from "@/hooks/use-session-branch-nav";
import { useSessionDrillDown } from "@/hooks/use-session-drill-down";
import { useSessionNavigation } from "@/hooks/use-session-navigation";
import { useSessionSummary } from "@/hooks/use-session-summary";
import { useSessions } from "@/hooks/use-sessions";
import type { SessionListItem } from "@/types/api/batch";

export function SessionManagementPage() {
  const filters = useSessionFilters();
  const drill = useSessionDrillDown();
  const { navigateToSession, navigatingSessionId } = useSessionNavigation();

  const branchNav = useSessionBranchNav(
    filters.tab,
    filters.search,
    drill.step === "branches",
  );
  const batchNav = useSessionBatchNav(
    drill.branchId,
    filters.tab,
    filters.search,
    drill.step === "batches",
  );

  const sessionsQuery = useMemo(
    () =>
      drill.step === "sessions" && drill.branchId && drill.batchId
        ? {
            page: filters.page,
            limit: PAGE_SIZE_SESSIONS,
            tab: filters.tab,
            search: filters.search.trim() || undefined,
            branchId: drill.branchId,
            batchId: drill.batchId,
          }
        : null,
    [
      drill.step,
      drill.branchId,
      drill.batchId,
      filters.page,
      filters.tab,
      filters.search,
    ],
  );

  const sessionsEnabled = sessionsQuery !== null;
  const sessionsListQuery = sessionsQuery ?? {
    page: 1,
    limit: PAGE_SIZE_SESSIONS,
    tab: filters.tab,
  };

  const statsSummary = useSessionSummary(filters.tab, drill.branchId);

  const {
    items,
    summary: sessionsSummary,
    total,
    totalPages,
    isLoading: sessionsLoading,
    isRefreshing: sessionsRefreshing,
    error: sessionsError,
    reload: reloadSessions,
  } = useSessions(sessionsListQuery, sessionsEnabled);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionListItem | null>(null);
  const [editDetailsSession, setEditDetailsSession] =
    useState<SessionListItem | null>(null);
  const [rescheduleSession, setRescheduleSession] = useState<SessionListItem | null>(
    null,
  );
  const [pinSession, setPinSession] = useState<SessionListItem | null>(null);
  const [statusSession, setStatusSession] = useState<{
    session: SessionListItem;
    action: "cancel" | "complete";
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleMenuAction = useCallback(
    (session: SessionListItem, action: SessionMenuAction) => {
      switch (action) {
        case "attendance":
          navigateToSession(session.id);
          break;
        case "edit":
          setEditSession(session);
          break;
        case "update-details":
          setEditDetailsSession(session);
          break;
        case "reschedule":
          setRescheduleSession(session);
          break;
        case "pin":
          setPinSession(session);
          break;
        case "complete":
          setStatusSession({ session, action: "complete" });
          break;
        case "cancel":
          setStatusSession({ session, action: "cancel" });
          break;
      }
    },
    [navigateToSession],
  );

  const handleSessionsReload = useCallback(async () => {
    await reloadSessions();
    if (drill.step === "batches") {
      await batchNav.reload();
    } else if (drill.step === "branches") {
      await branchNav.reload();
    }
  }, [reloadSessions, drill.step, batchNav, branchNav]);

  const isNavLoading =
    drill.step === "branches"
      ? branchNav.isLoading
      : drill.step === "batches"
        ? batchNav.isLoading
        : sessionsLoading;

  const navError =
    drill.step === "branches"
      ? branchNav.error
      : drill.step === "batches"
        ? batchNav.error
        : sessionsError;

  const isRefreshing =
    drill.step === "sessions" ? sessionsRefreshing : false;

  return (
    <div className="space-y-6 pb-8">
      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      ) : null}

      <SessionPageHeader onSchedule={() => setScheduleOpen(true)} />

      <SessionStatsStrip
        summary={drill.step === "sessions" ? sessionsSummary : statsSummary}
      />

      <SessionDrillBreadcrumb
        branchLabel={
          drill.step === "batches" || drill.step === "sessions"
            ? drill.branchLabel
            : null
        }
        batchLabel={drill.step === "sessions" ? drill.batchLabel : null}
        onSessions={drill.goToBranches}
        onBranch={
          drill.step === "sessions" && drill.branchLabel
            ? drill.goToBatches
            : undefined
        }
      />

      <SessionToolbar
        search={filters.search}
        onSearchChange={filters.setSearch}
        tab={filters.tab}
        onTabChange={filters.setTab}
        total={drill.step === "sessions" ? total : undefined}
      />

      {isRefreshing ? <InlineLoader label="Refreshing…" /> : null}

      {isNavLoading ? (
        drill.step === "sessions" ? (
          <SessionListSkeleton />
        ) : (
          <SessionNavGridSkeleton />
        )
      ) : navError ? (
        <p className="text-destructive">{navError}</p>
      ) : drill.step === "branches" ? (
        <SessionBranchGrid
          branches={branchNav.items}
          tab={filters.tab}
          onSelect={(b) => drill.selectBranch(b.id, b.name)}
        />
      ) : drill.step === "batches" ? (
        <SessionBatchGrid
          batches={batchNav.items}
          tab={filters.tab}
          onSelect={(b) => drill.selectBatch(b.id, b.name)}
        />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-secondary-400 px-6 py-16 text-center text-neutral-600">
              No sessions in this view for this batch.
            </p>
          ) : (
            <SessionListGrouped
              items={items}
              navigatingSessionId={navigatingSessionId}
              onNavigate={navigateToSession}
              onMenuAction={handleMenuAction}
            />
          )}
          <SessionPagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            onPageChange={filters.setPage}
          />
        </>
      )}

      <ScheduleSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void handleSessionsReload();
        }}
        defaultBranchId={drill.scheduleDefaultBranchId}
        defaultBatchId={drill.batchId ?? undefined}
      />

      <RescheduleSessionModal
        open={rescheduleSession !== null}
        onClose={() => setRescheduleSession(null)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void handleSessionsReload();
        }}
        session={rescheduleSession}
      />

      <EditSessionDetailsModal
        open={editDetailsSession !== null}
        onClose={() => setEditDetailsSession(null)}
        onSuccess={() => void handleSessionsReload()}
        session={
          editDetailsSession
            ? {
                id: editDetailsSession.id,
                batchId: editDetailsSession.batchId,
                sessionNumber: editDetailsSession.sessionNumber,
                scheduledAt: editDetailsSession.scheduledAt,
                scheduledEndAt: editDetailsSession.scheduledEndAt,
                branchId: editDetailsSession.branchId,
                branchName: editDetailsSession.branchName,
                status: editDetailsSession.status,
                pin: editDetailsSession.pin,
                notes: editDetailsSession.notes ?? null,
              }
            : null
        }
      />

      <EditSessionModal
        open={editSession !== null}
        onClose={() => setEditSession(null)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          void handleSessionsReload();
        }}
        session={
          editSession
            ? {
                id: editSession.id,
                batchId: editSession.batchId,
                sessionNumber: editSession.sessionNumber,
                scheduledAt: editSession.scheduledAt,
                branchName: editSession.branchName,
                branchLocation: editSession.branchLocation,
                batchCode: editSession.batchCode,
                batchName: editSession.batchName,
                status: editSession.status,
              }
            : null
        }
      />

      <SessionPinModal
        open={pinSession !== null}
        onClose={() => setPinSession(null)}
        onSuccess={() => void handleSessionsReload()}
        batchId={pinSession?.batchId ?? ""}
        sessionId={pinSession?.id ?? ""}
        sessionNumber={pinSession?.sessionNumber ?? 0}
        currentPin={pinSession?.pin ?? null}
      />

      <SessionStatusConfirmModal
        open={statusSession !== null}
        onClose={() => setStatusSession(null)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void handleSessionsReload();
        }}
        batchId={statusSession?.session.batchId ?? ""}
        sessionId={statusSession?.session.id ?? ""}
        sessionNumber={statusSession?.session.sessionNumber ?? 0}
        action={statusSession?.action ?? null}
        scheduledAt={statusSession?.session.scheduledAt}
        batchCode={statusSession?.session.batchCode}
        batchName={statusSession?.session.batchName}
        branchName={statusSession?.session.branchName}
        branchLocation={statusSession?.session.branchLocation}
      />
    </div>
  );
}
