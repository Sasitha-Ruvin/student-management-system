"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BatchDetailSkeleton } from "@/components/ui/loading-state";
import { formatMoney } from "@/lib/format/money";
import { formatBatchDateRange } from "@/components/batches/batch-date-range";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import {
  BatchDetailTabs,
  type BatchDetailTabId,
} from "@/components/batches/batch-detail-tabs";
import { BatchAttendanceTab } from "@/components/batches/batch-attendance-tab";
import { BatchFinanceTab } from "@/components/batches/batch-finance-tab";
import { BatchSessionsTab } from "@/components/batches/batch-sessions-tab";
import { BatchStudentsTab } from "@/components/batches/batch-students-tab";
import { CancelBatchModal } from "@/components/batches/cancel-batch-modal";
import { CompleteBatchModal } from "@/components/batches/complete-batch-modal";
import { DeleteBatchModal } from "@/components/batches/delete-batch-modal";
import { EditBatchModal } from "@/components/batches/edit-batch-modal";
import { GraduateGateModal } from "@/components/batches/graduate-gate-modal";
import { useBatchDetail } from "@/hooks/use-batch-detail";
import { Building2 } from "@/lib/icons";

type BatchDetailPageProps = {
  batchId: string;
};

export function BatchDetailPage({ batchId }: BatchDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BatchDetailTabId>("students");
  const { detail, isLoading, error, saveBatch, reload } = useBatchDetail(batchId);
  const [statusBusy, setStatusBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function transitionStatus(next: "ACTIVE" | "OPEN") {
    if (!detail) return;
    setStatusBusy(true);
    setStatusMessage(null);
    try {
      await saveBatch({ status: next });
      setStatusMessage(
        next === "OPEN"
          ? "Registration is open again for this batch."
          : "Batch is now active. Registrations are closed for this intake.",
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setStatusBusy(false);
    }
  }

  if (isLoading) {
    return <BatchDetailSkeleton />;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/batches" className="text-sm text-neutral-700 hover:text-primary-900">
          ← Back to batches
        </Link>
        <p className="text-destructive">{error ?? "Batch not found"}</p>
      </div>
    );
  }

  const canActivate = detail.status === "OPEN";
  const canReopenRegistration =
    detail.status === "ACTIVE" || detail.status === "CLOSED";
  const canCancel = detail.status === "OPEN" || detail.status === "ACTIVE";
  const canGraduate = detail.status === "ACTIVE";
  const hasScheduledSessions = detail.scheduledSessionCount > 0;
  const isTerminal =
    detail.status === "COMPLETED" || detail.status === "CLOSED";

  const sessionRangeWarning =
    detail.lastSessionScheduledAt &&
    new Date(detail.lastSessionScheduledAt) > new Date(detail.endDate)
      ? "Some sessions are scheduled after the batch end date."
      : detail.firstSessionScheduledAt &&
          new Date(detail.firstSessionScheduledAt) <
            new Date(detail.startDate)
        ? "Some sessions are scheduled before the batch start date."
        : null;

  function handleGraduateClick() {
    if (!detail) return;
    if (detail.scheduledSessionCount > 0) {
      setGateOpen(true);
    } else {
      setCompleteOpen(true);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-6 pb-8">
      <Link
        href="/dashboard/batches"
        className="text-sm text-neutral-700 hover:text-primary-900"
      >
        ← Back to batches
      </Link>

      <header className="space-y-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="font-headline text-2xl text-primary-900 sm:text-3xl">
                {detail.name}
              </h1>
              <BatchStatusBadge status={detail.status} />
            </div>
            <p className="font-mono text-sm text-neutral-600">{detail.batchCode}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-neutral-700">
              <Building2 className="size-4" aria-hidden />
              {detail.branchName}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {formatBatchDateRange(detail.startDate, detail.endDate)}
            </p>
            {detail.paymentPlanName ? (
              <p className="mt-1 text-sm text-neutral-600">
                Payment plan:{" "}
                <span className="font-medium text-primary-900">
                  {detail.paymentPlanName}
                </span>
              </p>
            ) : detail.installmentTemplates.length > 0 ? (
              <p className="mt-1 text-sm text-neutral-500">Custom batch instalment structure</p>
            ) : null}
          </div>
          {!isTerminal ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm font-medium"
              >
                Edit batch
              </button>
              {canActivate ? (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => void transitionStatus("ACTIVE")}
                  className="min-h-11 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100 disabled:opacity-60"
                >
                  Start batch
                </button>
              ) : null}
              {canReopenRegistration ? (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => void transitionStatus("OPEN")}
                  className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900 disabled:opacity-60"
                >
                  Reopen registration
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => setCancelOpen(true)}
                  className="min-h-11 rounded-xl border border-destructive/50 px-4 py-2.5 text-sm font-medium text-destructive disabled:opacity-60"
                >
                  Cancel batch
                </button>
              ) : null}
              {canGraduate ? (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={handleGraduateClick}
                  className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900 disabled:opacity-60"
                >
                  Complete & graduate
                </button>
              ) : null}
            </div>
          ) : detail.status === "CLOSED" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="min-h-11 rounded-xl border border-destructive/50 px-4 py-2.5 text-sm font-medium text-destructive"
              >
                Delete batch
              </button>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Students" value={String(detail.enrollmentCount)} />
          <MiniStat
            label="Sessions"
            value={`${detail.completedSessionCount}/${detail.sessionCount}`}
          />
          <MiniStat
            label="Scheduled"
            value={String(detail.scheduledSessionCount)}
          />
          <MiniStat
            label="Revenue"
            value={formatMoney(detail.revenueCollected, "LKR", { compact: true })}
          />
        </div>
      </header>

      {statusMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {statusMessage}
        </p>
      ) : null}

      {detail.status === "COMPLETED" ? (
        <p className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 px-4 py-3 text-sm text-neutral-700">
          This batch is completed. Active students were promoted to{" "}
          <Link
            href={`/dashboard/alumni?batchId=${detail.id}`}
            className="font-medium text-primary-900 underline"
          >
            alumni
          </Link>
          .
        </p>
      ) : null}

      {detail.status === "CLOSED" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This batch was cancelled. Students were not promoted to alumni.
        </p>
      ) : null}

      {sessionRangeWarning ? (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sessionRangeWarning}{" "}
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className="font-medium text-primary-900 underline"
          >
            Review sessions
          </button>
        </p>
      ) : null}

      {canGraduate && hasScheduledSessions ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {detail.scheduledSessionCount} session
            {detail.scheduledSessionCount === 1 ? "" : "s"} still scheduled. Click{" "}
            <button
              type="button"
              onClick={handleGraduateClick}
              className="font-medium text-primary-900 underline"
            >
              Complete & graduate
            </button>{" "}
            to resolve them here, or use the Sessions tab.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className="shrink-0 font-medium text-primary-900 underline"
          >
            Go to Sessions
          </button>
        </div>
      ) : null}

      <BatchDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-0 flex-1">
        {activeTab === "students" ? (
          <BatchStudentsTab batchId={batchId} batch={detail} />
        ) : null}
        {activeTab === "sessions" ? (
          <BatchSessionsTab
            batchId={batchId}
            batchCode={detail.batchCode}
            defaultBranchId={detail.branchId}
          />
        ) : null}
        {activeTab === "attendance" ? (
          <BatchAttendanceTab batchId={batchId} />
        ) : null}
        {activeTab === "finance" ? (
          <BatchFinanceTab batchId={batchId} batch={detail} onBatchUpdated={reload} />
        ) : null}
      </div>

      <CancelBatchModal
        open={cancelOpen}
        batchId={batchId}
        batchName={detail.name}
        enrollmentCount={detail.enrollmentCount}
        onClose={() => setCancelOpen(false)}
        onSuccess={(droppedCount) => {
          setCancelOpen(false);
          setStatusMessage(
            droppedCount > 0
              ? `Batch cancelled. ${droppedCount} student(s) dropped from this intake.`
              : "Batch cancelled.",
          );
          void reload();
        }}
      />

      <GraduateGateModal
        open={gateOpen}
        batchId={batchId}
        onClose={() => setGateOpen(false)}
        onContinue={() => {
          setGateOpen(false);
          setCompleteOpen(true);
        }}
        onGoToSessions={() => {
          setGateOpen(false);
          setActiveTab("sessions");
        }}
        onSessionsUpdated={() => void reload()}
      />

      <CompleteBatchModal
        open={completeOpen}
        batchId={batchId}
        batchName={detail.name}
        activeStudentCount={detail.enrollmentCount}
        onClose={() => setCompleteOpen(false)}
        onSuccess={(promotedCount) => {
          setCompleteOpen(false);
          setStatusMessage(
            promotedCount === 1
              ? "Batch completed. 1 student promoted to alumni."
              : `Batch completed. ${promotedCount} students promoted to alumni.`,
          );
          void reload();
        }}
      />

      <EditBatchModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        batch={detail}
        onSuccess={(message) => {
          setEditOpen(false);
          if (message) setStatusMessage(message);
          void reload();
        }}
      />

      <DeleteBatchModal
        open={deleteOpen}
        batchId={batchId}
        batchName={detail.name}
        batchCode={detail.batchCode}
        onClose={() => setDeleteOpen(false)}
        onSuccess={() => {
          router.push("/dashboard/batches");
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-secondary-300/40 bg-secondary-100/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="font-headline text-xl text-primary-900">{value}</p>
    </div>
  );
}
