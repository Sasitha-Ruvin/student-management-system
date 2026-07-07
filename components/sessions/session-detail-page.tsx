"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { InlineLoader } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { SessionPinDisplay } from "@/components/sessions/session-pin-display";
import { EditSessionDetailsModal } from "@/components/sessions/edit-session-details-modal";
import { EditSessionModal } from "@/components/sessions/edit-session-modal";
import { SessionPinModal } from "@/components/sessions/session-pin-modal";
import {
  deleteSessionAttendance,
  markSessionAttendance,
  searchSessionStudents,
} from "@/lib/api/sessions";
import { useSessionDetail } from "@/hooks/use-session-detail";
import type {
  AttendanceStatus,
  SessionAttendanceRow,
  SessionStudentSearchResult,
} from "@/types/api/batch";

type SessionDetailPageProps = {
  sessionId: string;
};

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
];

export function SessionDetailPage({ sessionId }: SessionDetailPageProps) {
  const { detail, isLoading, error, reload } = useSessionDetail(sessionId);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<SessionStudentSearchResult[]>(
    [],
  );
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (guestQuery.trim().length < 2) {
      setGuestResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      void searchSessionStudents(sessionId, guestQuery.trim())
        .then(setGuestResults)
        .catch(() => setGuestResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [guestQuery, sessionId]);

  const markStudent = useCallback(
    async (studentId: string, status: AttendanceStatus) => {
      setBusy(true);
      setActionError(null);
      try {
        await markSessionAttendance(sessionId, { studentId, status });
        await reload();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Failed to mark attendance");
      } finally {
        setBusy(false);
      }
    },
    [sessionId, reload],
  );

  const updateRow = useCallback(
    async (row: SessionAttendanceRow, status: AttendanceStatus) => {
      await markStudent(row.studentId, status);
    },
    [markStudent],
  );

  const removeRow = useCallback(
    async (attendanceId: string) => {
      setBusy(true);
      setActionError(null);
      try {
        await deleteSessionAttendance(sessionId, attendanceId);
        await reload();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Failed to remove attendance");
      } finally {
        setBusy(false);
      }
    },
    [sessionId, reload],
  );

  const markAllPresent = useCallback(async () => {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
    try {
      for (const s of detail.unmarkedStudents) {
        await markSessionAttendance(sessionId, {
          studentId: s.studentId,
          status: "PRESENT",
        });
      }
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to mark all present");
    } finally {
      setBusy(false);
    }
  }, [detail, sessionId, reload]);

  if (isLoading) {
    return <InlineLoader label="Loading session…" />;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/sessions" className="text-sm text-neutral-700">
          ← Back to sessions
        </Link>
        <p className="text-destructive">{error ?? "Session not found"}</p>
      </div>
    );
  }

  const scheduledStart = new Date(detail.scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  });
  const scheduledEnd = detail.scheduledEndAt
    ? new Date(detail.scheduledEndAt).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Colombo",
      })
    : null;
  const scheduled = scheduledEnd
    ? `${scheduledStart} – ${scheduledEnd}`
    : scheduledStart;

  return (
    <div className="space-y-6 pb-8">
      <Link href="/dashboard/sessions" className="text-sm text-neutral-700">
        ← Back to sessions
      </Link>

      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {successMessage}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            Session #{detail.sessionNumber}
          </p>
          <h1 className="font-headline text-2xl text-primary-900 md:text-3xl">
            {scheduled}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {detail.branchName} · {detail.branchLocation}
          </p>
          <p className="text-sm text-neutral-600">
            Batch:{" "}
            <Link
              href={`/dashboard/batches/${detail.batchId}`}
              className="font-medium text-primary-900 underline"
            >
              {detail.batchCode} — {detail.batchName}
            </Link>
          </p>
          <p className="mt-2 text-sm">
            Status: <span className="font-medium">{detail.status}</span>
            {detail.pin ? (
              <>
                {" "}
                · PIN: <span className="font-mono">{detail.pin}</span>
              </>
            ) : null}
          </p>
          {detail.notes ? (
            <p className="mt-1 text-sm text-neutral-600">Notes: {detail.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.status !== "COMPLETED" && detail.status !== "CANCELLED" ? (
            <button
              type="button"
              onClick={() => setEditDetailsOpen(true)}
              className="min-h-10 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
            >
              Edit session
            </button>
          ) : null}
          {detail.status !== "CANCELLED" ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="min-h-10 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
            >
              Message students
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="min-h-10 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            {detail.pin ? "Edit PIN" : "Set PIN"}
          </button>
          <SubmitButton
            type="button"
            loading={busy}
            disabled={detail.unmarkedStudents.length === 0}
            onClick={() => void markAllPresent()}
          >
            Mark all present
          </SubmitButton>
        </div>
      </header>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {detail.pin ? (
        <SessionPinDisplay
          pin={detail.pin}
          scheduledAt={detail.scheduledAt}
          status={detail.status}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="font-headline text-lg text-primary-900">Attendance</h2>
        <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Model code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {detail.attendances.map((row) => (
                <AttendanceRow
                  key={row.attendanceId}
                  row={row}
                  busy={busy}
                  onStatusChange={(s) => void updateRow(row, s)}
                  onDelete={() => void removeRow(row.attendanceId)}
                />
              ))}
              {detail.unmarkedStudents.map((s) => (
                <tr key={s.studentId} className="border-b border-secondary-300/40">
                  <td className="px-4 py-3">{s.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.modelCode}</td>
                  <td className="px-4 py-3 text-neutral-500">—</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(["PRESENT", "ABSENT", "LATE"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={busy}
                          onClick={() => void markStudent(s.studentId, st)}
                          className="rounded-lg border border-secondary-400 px-2 py-1 text-xs disabled:opacity-50"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4">
        <div>
          <h2 className="font-headline text-lg text-primary-900">Guest student</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Mark attendance for a student enrolled in another branch or batch — for
            example when they join this session temporarily. No second enrollment or
            payment setup required. They appear with a{" "}
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900">
              Guest
            </span>{" "}
            badge. For regular attendance at this batch, enroll them via the student
            profile instead.
          </p>
        </div>
        <input
          type="search"
          value={guestQuery}
          onChange={(e) => setGuestQuery(e.target.value)}
          placeholder="Search by name, model code, or NIC…"
          className="min-h-11 w-full max-w-md rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2 text-sm focus:border-primary-900 focus:outline-none"
        />
        {searching ? <p className="text-xs text-neutral-500">Searching…</p> : null}
        <ul className="space-y-2">
          {guestResults.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-secondary-300/40 px-3 py-2"
            >
              <div>
                <p className="font-medium text-primary-900">{g.fullName}</p>
                <p className="text-xs text-neutral-500">
                  {g.modelCode}
                  {g.currentBatchCode ? ` · ${g.currentBatchCode}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {(["PRESENT", "ABSENT", "LATE"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busy}
                    onClick={() => void markStudent(g.id, st)}
                    className="rounded-lg border border-secondary-400 px-2 py-1 text-xs"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <EditSessionDetailsModal
        open={editDetailsOpen}
        onClose={() => setEditDetailsOpen(false)}
        onSuccess={() => void reload()}
        session={{
          id: detail.id,
          batchId: detail.batchId,
          sessionNumber: detail.sessionNumber,
          scheduledAt: detail.scheduledAt,
          scheduledEndAt: detail.scheduledEndAt,
          branchId: detail.branchId,
          branchName: detail.branchName,
          status: detail.status,
          pin: detail.pin,
          notes: detail.notes,
        }}
      />

      <EditSessionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={(message) => {
          setSuccessMessage(message);
          void reload();
        }}
        session={{
          id: detail.id,
          batchId: detail.batchId,
          sessionNumber: detail.sessionNumber,
          scheduledAt: detail.scheduledAt,
          branchName: detail.branchName,
          branchLocation: detail.branchLocation,
          batchCode: detail.batchCode,
          batchName: detail.batchName,
          status: detail.status,
        }}
      />

      <SessionPinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={() => void reload()}
        batchId={detail.batchId}
        sessionId={detail.id}
        sessionNumber={detail.sessionNumber}
        currentPin={detail.pin}
      />
    </div>
  );
}

function AttendanceRow({
  row,
  busy,
  onStatusChange,
  onDelete,
}: {
  row: SessionAttendanceRow;
  busy: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-secondary-300/40 last:border-0">
      <td className="px-4 py-3">
        {row.fullName}
        {row.isCrossBranch ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900">
            Guest
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 font-mono text-xs">{row.modelCode}</td>
      <td className="px-4 py-3">
        <Select
          value={row.status}
          onChange={(v) => onStatusChange(v as AttendanceStatus)}
          options={STATUS_OPTIONS}
          disabled={busy}
          aria-label={`Status for ${row.fullName}`}
        />
      </td>
      <td className="px-4 py-3 text-neutral-600">{row.source}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="text-xs text-destructive underline disabled:opacity-50"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

