"use client";

import { useMemo, useState } from "react";

import { BRANCH_DAY_NAMES } from "@/lib/branches/class-day-utils";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash2 } from "@/lib/icons";
import type { SessionPreviewItem } from "@/types/api/batch";

export type EditableSessionRow = SessionPreviewItem & {
  rowId: string;
  /** HH:mm — start time for this session (Colombo) */
  classTime: string;
  /** HH:mm — optional end time */
  classEndTime: string;
};

type CreateBatchSessionEditorProps = {
  rows: EditableSessionRow[];
  onChange: (rows: EditableSessionRow[]) => void;
  startDate: string;
  endDate: string;
  defaultClassTime: string;
  defaultClassEndTime: string;
  isLoading: boolean;
  onRegenerate: () => void;
  listError: string | null;
  onListError: (message: string | null) => void;
};

const inputClass =
  "min-h-9 rounded-lg border border-secondary-400 bg-tertiary-100 px-2 py-1.5 text-sm outline-none focus:border-primary-900";

function newRowId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function previewToEditableRows(
  items: SessionPreviewItem[],
  defaultClassTime: string,
  defaultClassEndTime = "",
): EditableSessionRow[] {
  return items.map((item) => ({
    ...item,
    rowId: newRowId(),
    classTime: defaultClassTime,
    classEndTime: defaultClassEndTime,
  }));
}

function sortRows(rows: EditableSessionRow[]): EditableSessionRow[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function dayOfWeekFromIso(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

function validateDateInRange(
  iso: string,
  startDate: string,
  endDate: string,
): string | null {
  if (!iso) return "Date is required";
  if (iso < startDate || iso > endDate) {
    return `Date must be between ${startDate} and ${endDate}`;
  }
  return null;
}

function validateEndAfterStart(start: string, end: string): string | null {
  if (!end.trim()) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    return "End time must be after start time";
  }
  return null;
}

export function CreateBatchSessionEditor({
  rows,
  onChange,
  startDate,
  endDate,
  defaultClassTime,
  defaultClassEndTime,
  isLoading,
  onRegenerate,
  listError,
  onListError,
}: CreateBatchSessionEditorProps) {
  const [newDate, setNewDate] = useState("");

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);

  function updateRows(next: EditableSessionRow[]) {
    onChange(sortRows(next));
  }

  function toggleRow(rowId: string) {
    updateRows(
      rows.map((r) => (r.rowId === rowId ? { ...r, selected: !r.selected } : r)),
    );
  }

  function setAllSelected(selected: boolean) {
    updateRows(rows.map((r) => ({ ...r, selected })));
  }

  function applyDefaultTimeToAll() {
    updateRows(
      rows.map((r) => ({
        ...r,
        classTime: defaultClassTime,
        classEndTime: defaultClassEndTime,
      })),
    );
    onListError(null);
  }

  function removeRow(rowId: string) {
    if (rows.length <= 1) {
      onListError("At least one session date is required");
      return;
    }
    onListError(null);
    updateRows(rows.filter((r) => r.rowId !== rowId));
  }

  function changeRowDate(rowId: string, iso: string) {
    const rangeErr = validateDateInRange(iso, startDate, endDate);
    if (rangeErr) {
      onListError(rangeErr);
      return;
    }
    if (rows.some((r) => r.rowId !== rowId && r.date === iso)) {
      onListError("This date is already in the list");
      return;
    }
    onListError(null);
    updateRows(
      rows.map((r) =>
        r.rowId === rowId
          ? { ...r, date: iso, dayOfWeek: dayOfWeekFromIso(iso) }
          : r,
      ),
    );
  }

  function changeRowTime(
    rowId: string,
    field: "classTime" | "classEndTime",
    value: string,
  ) {
    const next = value.slice(0, 5);
    const row = rows.find((r) => r.rowId === rowId);
    if (!row) return;

    const updated = { ...row, [field]: next };
    const endErr =
      field === "classEndTime" || field === "classTime"
        ? validateEndAfterStart(
            field === "classTime" ? next : updated.classTime,
            field === "classEndTime" ? next : updated.classEndTime,
          )
        : null;
    if (endErr) {
      onListError(endErr);
      return;
    }
    onListError(null);
    updateRows(rows.map((r) => (r.rowId === rowId ? updated : r)));
  }

  function addRow() {
    const iso = newDate.trim();
    const rangeErr = validateDateInRange(iso, startDate, endDate);
    if (rangeErr) {
      onListError(rangeErr);
      return;
    }
    if (rows.some((r) => r.date === iso)) {
      onListError("This date is already in the list");
      return;
    }
    onListError(null);
    updateRows([
      ...rows,
      {
        rowId: newRowId(),
        date: iso,
        dayOfWeek: dayOfWeekFromIso(iso),
        selected: true,
        classTime: defaultClassTime,
        classEndTime: defaultClassEndTime,
      },
    ]);
    setNewDate("");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-8 text-primary-900" label="Loading sessions" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">
          {selectedCount} of {rows.length} sessions selected · default{" "}
          {defaultClassTime}
          {defaultClassEndTime.trim()
            ? ` – ${defaultClassEndTime}`
            : " (no default end)"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllSelected(true)}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-primary-900"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setAllSelected(false)}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-primary-900"
          >
            Deselect all
          </button>
          <button
            type="button"
            onClick={applyDefaultTimeToAll}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-primary-900"
          >
            Reset all times
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-neutral-700"
          >
            Reset to branch schedule
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Add session date
          </span>
          <input
            type="date"
            min={startDate}
            max={endDate}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={inputClass + " w-full"}
          />
        </label>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary-900 px-4 py-2 text-sm font-medium text-tertiary-100"
        >
          <Plus className="size-4" />
          Add date
        </button>
      </div>

      {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-secondary-300/60 p-2">
        {rows.map((item, index) => (
          <div
            key={item.rowId}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary-300/40 bg-secondary-100/20 px-2 py-2 lg:flex-nowrap"
          >
            <input
              type="checkbox"
              checked={item.selected}
              onChange={() => toggleRow(item.rowId)}
              className="size-4 shrink-0 rounded border-secondary-400"
              aria-label={`Select session ${index + 1}`}
            />
            <span className="w-6 shrink-0 text-xs text-neutral-500">{index + 1}</span>
            <input
              type="date"
              min={startDate}
              max={endDate}
              value={item.date}
              onChange={(e) => changeRowDate(item.rowId, e.target.value)}
              className={inputClass + " min-w-[130px] flex-1"}
              aria-label={`Session ${index + 1} date`}
            />
            <span className="hidden min-w-[4.5rem] text-sm text-neutral-600 sm:inline">
              {BRANCH_DAY_NAMES[item.dayOfWeek]}
            </span>
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              <span className="sr-only">Start</span>
              <input
                type="time"
                value={item.classTime}
                onChange={(e) =>
                  changeRowTime(item.rowId, "classTime", e.target.value)
                }
                className={inputClass + " w-[7rem]"}
                aria-label={`Session ${index + 1} start time`}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              <span className="hidden sm:inline">to</span>
              <input
                type="time"
                value={item.classEndTime}
                onChange={(e) =>
                  changeRowTime(item.rowId, "classEndTime", e.target.value)
                }
                className={inputClass + " w-[7rem]"}
                aria-label={`Session ${index + 1} end time (optional)`}
              />
            </label>
            <button
              type="button"
              onClick={() => removeRow(item.rowId)}
              disabled={rows.length <= 1}
              className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg border border-secondary-400 text-destructive disabled:opacity-40"
              aria-label={`Remove session ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-500">
        Set start and optional end time per session. Leave end blank for open-ended
        sessions. Times are Sri Lanka (Colombo). Only checked rows are created.
      </p>
    </div>
  );
}
