"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { deactivationBlockedMessage } from "@/lib/branches/deactivation-messages";

import { ClassDayPicker } from "@/components/branches/class-day-picker";
import { BranchDetailSkeleton } from "@/components/ui/loading-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
import { useBranchDetail } from "@/hooks/use-branch-detail";
import { BRANCH_DAY_NAMES } from "@/lib/branches/class-day-utils";
import { Banknote, CalendarCheck, Layers, Trash2, Users } from "@/lib/icons";
import type { BranchClassDayDto } from "@/types/api/branch";

import { BranchStatusBadge } from "./branch-status-badge";

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function formatSessionDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFees(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type BranchDetailPageProps = {
  branchId: string;
};

export function BranchDetailPage({ branchId }: BranchDetailPageProps) {
  const {
    detail,
    isLoading,
    error,
    hasScheduledSessions,
    saveProfile,
    addDay,
    removeDay,
  } = useBranchDetail(branchId);

  const searchParams = useSearchParams();
  const profileSectionRef = useRef<HTMLElement>(null);
  const [highlightProfile, setHighlightProfile] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (hasScheduledSessions) {
      setWarningDismissed(false);
    }
  }, [hasScheduledSessions]);

  useEffect(() => {
    if (!detail || searchParams.get("focus") !== "profile") {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      profileSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    setHighlightProfile(true);
    const timer = window.setTimeout(() => setHighlightProfile(false), 2400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [searchParams, detail]);

  if (isLoading) {
    return <BranchDetailSkeleton />;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/branches"
          className="text-sm text-neutral-700 hover:text-primary-900"
        >
          ← Back to branches
        </Link>
        <p className="text-destructive">{error ?? "Branch not found"}</p>
      </div>
    );
  }

  const showWarning = hasScheduledSessions && !warningDismissed;

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/branches"
          className="text-sm text-neutral-700 hover:text-primary-900"
        >
          ← Back to branches
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl text-primary-900 sm:text-3xl">
                {detail.name}
              </h1>
              <span className="rounded-lg bg-secondary-200 px-2.5 py-1 font-mono text-sm font-medium text-primary-900">
                {detail.branchCode}
              </span>
              <BranchStatusBadge isActive={detail.isActive} />
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              Branch ID{" "}
              <span className="font-mono text-neutral-800" title={detail.id}>
                {shortId(detail.id)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              profileSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              setHighlightProfile(true);
              window.setTimeout(() => setHighlightProfile(false), 2400);
            }}
            className="min-h-11 shrink-0 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
          >
            Edit profile
          </button>
        </div>
      </div>

      {showWarning ? (
        <SessionWarningBanner onDismiss={() => setWarningDismissed(true)} />
      ) : null}

      <DetailStatsRow detail={detail} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          id="branch-profile-edit"
          ref={profileSectionRef}
          className={[
            "scroll-mt-6 rounded-2xl transition-shadow duration-500",
            highlightProfile
              ? "ring-2 ring-primary-900/40 ring-offset-2 ring-offset-tertiary-100"
              : "",
          ].join(" ")}
        >
          <BranchEditForm detail={detail} onSave={saveProfile} />
        </section>
        <ClassDaysSection
          classDays={detail.classDays}
          onAdd={addDay}
          onDelete={removeDay}
        />
      </div>

      <ActiveBatchesSection batches={detail.activeBatches} />
    </div>
  );
}

function SessionWarningBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
    >
      <p>
        Sessions already created won&apos;t auto-update when class days are
        changed.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-11 shrink-0 self-start rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-amber-100 active:bg-amber-200/80"
      >
        Dismiss
      </button>
    </div>
  );
}

function DetailStatsRow({
  detail,
}: {
  detail: {
    stats: {
      totalEnrolled: number;
      feesCollectedThisYear: number;
      nextSessionDate: string | null;
    };
  };
}) {
  const items = [
    {
      key: "enrolled",
      label: "Total enrolled",
      icon: Users,
      value: String(detail.stats.totalEnrolled),
    },
    {
      key: "fees",
      label: "Fees collected this year",
      icon: Banknote,
      value: formatFees(detail.stats.feesCollectedThisYear),
    },
    {
      key: "next",
      label: "Next session",
      icon: CalendarCheck,
      value: formatSessionDate(detail.stats.nextSessionDate),
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ key, label, icon: Icon, value }) => (
        <div
          key={key}
          className="flex items-center gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary-200/80">
            <Icon className="size-5 text-primary-900" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-headline text-xl text-primary-900 sm:text-2xl">
              {value}
            </p>
            <p className="text-[11px] tracking-wide text-neutral-600 uppercase">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BranchEditForm({
  detail,
  onSave,
}: {
  detail: {
    name: string;
    location: string;
    isActive: boolean;
    activeStudentCount: number;
  };
  onSave: (body: {
    name?: string;
    location?: string;
    isActive?: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(detail.name);
  const [location, setLocation] = useState(detail.location);
  const [isActive, setIsActive] = useState(detail.isActive);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(detail.name);
    setLocation(detail.location);
    setIsActive(detail.isActive);
  }, [detail.name, detail.location, detail.isActive]);

  const inputClass =
    "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-base outline-none focus:border-primary-900 sm:text-sm";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!isActive && detail.isActive && detail.activeStudentCount > 0) {
      setMessage(deactivationBlockedMessage(detail.activeStudentCount));
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), location: location.trim(), isActive });
      setMessage("Branch updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  const cannotDeactivate =
    detail.isActive && detail.activeStudentCount > 0;

  return (
    <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="mb-4 font-headline text-xl text-primary-900">
        Branch details
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Location</span>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isActive}
            disabled={cannotDeactivate && isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-secondary-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-sm text-neutral-700">Active branch</span>
        </label>
        {cannotDeactivate ? (
          <p className="text-sm text-neutral-600">
            {deactivationBlockedMessage(detail.activeStudentCount)} Remove or
            move students before deactivating.
          </p>
        ) : null}
        {message ? (
          <p
            className={
              message.includes("Failed") ||
              message.startsWith("Cannot deactivate")
                ? "text-sm text-destructive"
                : "text-sm text-neutral-700"
            }
          >
            {message}
          </p>
        ) : null}
        <SubmitButton
          loading={isSaving}
          loadingText="Saving…"
          className="w-full sm:w-auto"
        >
          Save changes
        </SubmitButton>
      </form>
    </div>
  );
}

function ClassDaysSection({
  classDays,
  onAdd,
  onDelete,
}: {
  classDays: BranchClassDayDto[];
  onAdd: (body: { dayOfWeek: number }) => Promise<void>;
  onDelete: (dayId: string) => Promise<void>;
}) {
  const [pendingDays, setPendingDays] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingDays = classDays.map((d) => d.dayOfWeek);

  async function handleAddDays() {
    if (pendingDays.length === 0) return;
    setError(null);
    setIsAdding(true);
    try {
      for (const dayOfWeek of pendingDays) {
        await onAdd({ dayOfWeek });
      }
      setPendingDays([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add class day");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(dayId: string) {
    setDeletingId(dayId);
    setError(null);
    try {
      await onDelete(dayId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="mb-1 font-headline text-xl text-primary-900">Class days</h2>
      <p className="mb-4 text-sm text-neutral-600">
        Weekdays this branch runs classes. Session date and time are managed
        separately.
      </p>

      {classDays.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-600">No class days yet.</p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2">
          {classDays.map((day) => (
            <li
              key={day.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary-200/80 py-1.5 pr-1.5 pl-3 text-sm font-medium text-primary-900"
            >
              {BRANCH_DAY_NAMES[day.dayOfWeek]}
              <button
                type="button"
                onClick={() => void handleDelete(day.id)}
                disabled={deletingId === day.id}
                className="flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-secondary-300 hover:text-destructive active:bg-secondary-400/80 disabled:opacity-50"
                aria-label={`Remove ${BRANCH_DAY_NAMES[day.dayOfWeek]}`}
              >
                {deletingId === day.id ? (
                  <Spinner className="size-3.5" label="Removing" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-secondary-300/60 pt-4">
        <p className="text-sm font-medium text-neutral-700">Add class days</p>
        <ClassDayPicker
          selectedDays={pendingDays}
          onChange={setPendingDays}
          disabledDays={existingDays}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          disabled={isAdding || pendingDays.length === 0}
          onClick={() => void handleAddDays()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary-900 py-3 text-sm font-medium text-primary-900 hover:bg-secondary-200/60 active:bg-secondary-200 disabled:opacity-60"
        >
          {isAdding ? (
            <>
              <Spinner className="size-4" label="Adding class days" />
              Adding…
            </>
          ) : (
            "Add selected days"
          )}
        </button>
      </div>
    </section>
  );
}

function ActiveBatchesSection({
  batches,
}: {
  batches: {
    id: string;
    batchCode: string;
    name: string;
    status: string;
    enrollmentCount: number;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Layers className="size-5 text-primary-900" />
        <h2 className="font-headline text-xl text-primary-900">
          Active batches
        </h2>
      </div>

      {batches.length === 0 ? (
        <p className="text-sm text-neutral-600">
          No open batches at this branch.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-300/60 text-[11px] tracking-wide text-neutral-600 uppercase">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className="border-b border-secondary-300/40 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/batches/${batch.id}`}
                      className="font-mono text-sm font-medium text-primary-900 hover:underline"
                    >
                      {batch.batchCode}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-neutral-800">{batch.name}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-secondary-200 px-2 py-0.5 text-xs font-medium">
                      {batch.status}
                    </span>
                  </td>
                  <td className="py-3 font-headline text-lg text-primary-900">
                    {batch.enrollmentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
