"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BulkRescheduleModal } from "@/components/sessions/bulk-reschedule-modal";
import { formatColomboDateTime } from "@/lib/sessions/colombo-time";
import { ChevronUp, ChevronDown } from "@/lib/icons";
import { updateSession } from "@/lib/api/batches";
import { EditSessionDetailsModal } from "@/components/sessions/edit-session-details-modal";
import { EditSessionModal } from "@/components/sessions/edit-session-modal";
import { RescheduleSessionModal } from "@/components/sessions/reschedule-session-modal";
import { ScheduleSessionModal } from "@/components/sessions/schedule-session-modal";
import { SessionPinModal } from "@/components/sessions/session-pin-modal";
import { SessionStatusConfirmModal } from "@/components/sessions/session-status-confirm-modal";
import { InlineLoader } from "@/components/ui/loading-state";
import { useBatchSessions } from "@/hooks/use-batch-detail";
import type { BatchSessionRow } from "@/types/api/batch";

type BatchSessionsTabProps = {
  batchId: string;
  batchCode: string;
  defaultBranchId: string;
};

export function BatchSessionsTab({
  batchId,
  batchCode,
  defaultBranchId,
}: BatchSessionsTabProps) {
  const { sessions, isLoading, error, reload } = useBatchSessions(batchId, true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<BatchSessionRow | null>(
    null,
  );
  const [editSession, setEditSession] = useState<BatchSessionRow | null>(null);
  const [editDetailsSession, setEditDetailsSession] =
    useState<BatchSessionRow | null>(null);
  const [pinSession, setPinSession] = useState<BatchSessionRow | null>(null);
  const [statusSession, setStatusSession] = useState<{
    session: BatchSessionRow;
    action: "cancel" | "complete";
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isLoading) return <InlineLoader label="Loading sessions…" />;
  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBulkOpen(true)}
          className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm font-medium"
        >
          Bulk reschedule
        </button>
        <button
          type="button"
          onClick={() => setScheduleOpen(true)}
          className="min-h-11 rounded-xl bg-primary-900 px-4 py-2 text-sm font-medium text-tertiary-100"
        >
          Add extra session
        </button>
      </div>

      <SessionTable
        sessions={sessions}
        busyId={busyId}
        batchId={batchId}
        onEdit={setEditSession}
        onEditDetails={setEditDetailsSession}
        onReschedule={setRescheduleSession}
        onPin={setPinSession}
        onStatus={(session, action) => setStatusSession({ session, action })}
        onMoved={() => void reload()}
        setBusyId={setBusyId}
      />

      <ScheduleSessionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void reload();
        }}
        fixedBatchId={batchId}
        fixedBatchLabel={batchCode}
        defaultBranchId={defaultBranchId}
      />

      <BulkRescheduleModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void reload();
        }}
        batchId={batchId}
        batchCode={batchCode}
      />

      <EditSessionDetailsModal
        open={editDetailsSession !== null}
        onClose={() => setEditDetailsSession(null)}
        onSuccess={() => void reload()}
        session={
          editDetailsSession
            ? {
                id: editDetailsSession.id,
                batchId,
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
          void reload();
        }}
        session={
          editSession
            ? {
                id: editSession.id,
                batchId,
                sessionNumber: editSession.sessionNumber,
                scheduledAt: editSession.scheduledAt,
                branchName: editSession.branchName,
                batchCode,
                status: editSession.status,
              }
            : null
        }
      />

      <RescheduleSessionModal
        open={rescheduleSession !== null}
        onClose={() => setRescheduleSession(null)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void reload();
        }}
        session={
          rescheduleSession
            ? {
                ...rescheduleSession,
                batchId,
                batchCode,
                batchName: batchCode,
              }
            : null
        }
      />

      <SessionPinModal
        open={pinSession !== null}
        onClose={() => setPinSession(null)}
        onSuccess={() => void reload()}
        batchId={batchId}
        sessionId={pinSession?.id ?? ""}
        sessionNumber={pinSession?.sessionNumber ?? 0}
        currentPin={pinSession?.pin ?? null}
      />

      <SessionStatusConfirmModal
        open={statusSession !== null}
        onClose={() => setStatusSession(null)}
        onSuccess={(message) => {
          if (message) setSuccessMessage(message);
          void reload();
        }}
        batchId={batchId}
        sessionId={statusSession?.session.id ?? ""}
        sessionNumber={statusSession?.session.sessionNumber ?? 0}
        action={statusSession?.action ?? null}
        scheduledAt={statusSession?.session.scheduledAt}
        batchCode={batchCode}
        batchName={batchCode}
        branchName={statusSession?.session.branchName}
      />
    </div>
  );
}

function SessionTable({
  sessions,
  busyId,
  batchId,
  onEdit,
  onEditDetails,
  onReschedule,
  onPin,
  onStatus,
  onMoved,
  setBusyId,
}: {
  sessions: BatchSessionRow[];
  busyId: string | null;
  batchId: string;
  onEdit: (s: BatchSessionRow) => void;
  onEditDetails: (s: BatchSessionRow) => void;
  onReschedule: (s: BatchSessionRow) => void;
  onPin: (s: BatchSessionRow) => void;
  onStatus: (s: BatchSessionRow, action: "cancel" | "complete") => void;
  onMoved: () => void;
  setBusyId: (id: string | null) => void;
}) {
  async function handleMove(sessionId: string, direction: "move-up" | "move-down") {
    setBusyId(sessionId);
    try {
      await updateSession(batchId, sessionId, { action: direction });
      onMoved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reorder session");
    } finally {
      setBusyId(null);
    }
  }
  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-secondary-400 px-4 py-10 text-center text-neutral-600">
        No sessions yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Branch</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">PIN</th>
            <th className="px-4 py-3">Attendance</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, idx) => (
            <tr key={s.id} className="border-b border-secondary-300/40 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={busyId === s.id || idx === 0}
                      onClick={() => void handleMove(s.id, "move-up")}
                      className="rounded p-0.5 text-neutral-400 hover:text-primary-900 disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id || idx === sessions.length - 1}
                      onClick={() => void handleMove(s.id, "move-down")}
                      className="rounded p-0.5 text-neutral-400 hover:text-primary-900 disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <SessionNumberInput
                    batchId={batchId}
                    sessionId={s.id}
                    sessionNumber={s.sessionNumber}
                    disabled={busyId === s.id}
                    onBusy={setBusyId}
                    onSaved={onMoved}
                  />
                  <Link
                    href={`/dashboard/sessions/${s.id}`}
                    className="text-xs text-neutral-500 underline hover:text-primary-900"
                    title="Open session"
                  >
                    View
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3">
                {formatColomboDateTime(s.scheduledAt, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {s.isRelocated ? (
                  <span className="ml-2 rounded bg-secondary-200 px-1.5 text-xs">
                    relocated
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3">{s.branchName}</td>
              <td className="px-4 py-3">
                <SessionStatusLabel status={s.status} />
              </td>
              <td className="px-4 py-3 font-mono">{s.pin ?? "—"}</td>
              <td className="px-4 py-3">
                {s.presentCount}/{s.attendanceCount}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <SessionActionBtn
                    label="Attendance"
                    href={`/dashboard/sessions/${s.id}`}
                  />
                  {s.status !== "COMPLETED" && s.status !== "CANCELLED" ? (
                    <SessionActionBtn
                      disabled={busyId === s.id}
                      label="Edit"
                      onClick={() => onEditDetails(s)}
                    />
                  ) : null}
                  {s.status !== "CANCELLED" ? (
                    <SessionActionBtn
                      disabled={busyId === s.id}
                      label="Message"
                      onClick={() => onEdit(s)}
                    />
                  ) : null}
                  {s.status !== "COMPLETED" && s.status !== "CANCELLED" ? (
                    <SessionActionBtn
                      disabled={busyId === s.id}
                      label="Reschedule"
                      onClick={() => onReschedule(s)}
                    />
                  ) : null}
                  <SessionActionBtn
                    disabled={busyId === s.id}
                    label="PIN"
                    onClick={() => onPin(s)}
                  />
                  <SessionActionBtn
                    disabled={busyId === s.id}
                    label="Complete"
                    variant="success"
                    onClick={() => onStatus(s, "complete")}
                  />
                  <SessionActionBtn
                    disabled={busyId === s.id}
                    label="Cancel"
                    variant="danger"
                    onClick={() => onStatus(s, "cancel")}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sessionNumberInputClass =
  "w-14 min-h-9 rounded-lg border border-secondary-400 bg-tertiary-100 px-2 py-1 text-center text-sm font-medium text-primary-900 focus:border-primary-900 focus:outline-none disabled:opacity-50";

function SessionNumberInput({
  batchId,
  sessionId,
  sessionNumber,
  disabled,
  onBusy,
  onSaved,
}: {
  batchId: string;
  sessionId: string;
  sessionNumber: number;
  disabled: boolean;
  onBusy: (id: string | null) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(sessionNumber));

  useEffect(() => {
    setValue(String(sessionNumber));
  }, [sessionNumber]);

  async function commit() {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setValue(String(sessionNumber));
      return;
    }
    if (parsed === sessionNumber) return;

    onBusy(sessionId);
    try {
      await updateSession(batchId, sessionId, {
        action: "set-session-number",
        sessionNumber: parsed,
      });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update session number");
      setValue(String(sessionNumber));
    } finally {
      onBusy(null);
    }
  }

  return (
    <input
      type="number"
      min={1}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          setValue(String(sessionNumber));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={sessionNumberInputClass}
      aria-label={`Session number, currently ${sessionNumber}`}
      title="Edit session number (Enter to save)"
    />
  );
}

function SessionStatusLabel({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex rounded-lg border border-green-200/80 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-900">
        {status}
      </span>
    );
  }
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-lg border border-red-200/80 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-900">
        {status}
      </span>
    );
  }
  return <span>{status}</span>;
}

const SESSION_ACTION_BTN_BASE =
  "rounded-lg border px-2 py-1 text-xs transition-colors disabled:opacity-50";

const SESSION_ACTION_BTN_VARIANT = {
  default: "border-secondary-400 bg-tertiary-100 hover:bg-secondary-100",
  success:
    "border-green-200/80 bg-green-50 text-green-900 hover:bg-green-100/80",
  danger: "border-red-200/80 bg-red-50 text-red-900 hover:bg-red-100/80",
} as const;

function SessionActionBtn({
  label,
  onClick,
  href,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: keyof typeof SESSION_ACTION_BTN_VARIANT;
}) {
  const className = `${SESSION_ACTION_BTN_BASE} ${SESSION_ACTION_BTN_VARIANT[variant]}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {label}
    </button>
  );
}
