"use client";

import { MapPin, Users } from "@/lib/icons";
import { formatColomboTime } from "@/lib/sessions/colombo-time";
import type { SessionListItem } from "@/types/api/batch";

import { SessionActionMenu, type SessionMenuAction } from "./session-action-menu";

export type SessionCardData = SessionListItem;

type SessionCardProps = {
  session: SessionCardData;
  onNavigate: () => void;
  onMenuAction: (action: SessionMenuAction) => void;
  isNavigating?: boolean;
  /** Hide batch title when list is grouped by batch */
  compact?: boolean;
};

function formatTime(iso: string): string {
  return formatColomboTime(iso);
}

function statusBadge(status: SessionCardData["status"]): string | null {
  if (status === "RESCHEDULED") return "Rescheduled";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "COMPLETED") return "Completed";
  return null;
}

export function SessionCard({
  session,
  onNavigate,
  onMenuAction,
  isNavigating,
  compact = true,
}: SessionCardProps) {
  const badge = statusBadge(session.status);
  const isFull =
    session.enrollmentCount > 0 &&
    session.markedCount >= session.enrollmentCount;

  return (
    <article
      className={[
        "flex flex-col gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:gap-6 sm:p-5",
        isNavigating ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex shrink-0 sm:w-32 sm:border-r sm:border-secondary-300/50 sm:pr-5">
        <div>
          <p className="font-headline text-lg text-primary-900">
            {formatTime(session.scheduledAt)}
          </p>
          <p className="text-xs text-neutral-500">Session #{session.sessionNumber}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {!compact ? (
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-headline text-lg text-primary-900">{session.batchName}</h3>
            <span className="font-mono text-xs text-neutral-500">{session.batchCode}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {badge ? (
            <span className="rounded-full bg-secondary-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700">
              {badge}
            </span>
          ) : null}
          {session.isRelocated ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
              Relocated
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-neutral-600">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span>
            {session.branchName}
            {session.branchLocation ? ` · ${session.branchLocation}` : ""}
          </span>
        </p>
        {session.pin && session.status === "SCHEDULED" ? (
          <p className="inline-flex items-center gap-2 rounded-lg bg-primary-900/10 px-2.5 py-1 text-sm">
            <span className="text-xs text-neutral-600">PIN</span>
            <span className="font-mono text-lg font-bold tracking-widest text-primary-900">
              {session.pin}
            </span>
          </p>
        ) : session.pin ? (
          <p className="text-xs text-neutral-500">
            PIN: <span className="font-mono text-primary-900">{session.pin}</span>
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Users className="size-4 text-neutral-500" aria-hidden />
          <span>
            {session.markedCount} / {session.enrollmentCount}
          </span>
          {isFull ? (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-800">
              Full
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="min-h-10 rounded-xl bg-primary-900 px-4 py-2 text-sm font-medium text-tertiary-100"
        >
          Attendance
        </button>
        <SessionActionMenu
          onAction={onMenuAction}
          sessionStatus={session.status}
        />
      </div>
    </article>
  );
}
