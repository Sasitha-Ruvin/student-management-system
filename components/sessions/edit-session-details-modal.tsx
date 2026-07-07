"use client";

import { useEffect, useState } from "react";

import { SessionPinField } from "@/components/sessions/session-pin-field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { updateSession } from "@/lib/api/batches";
import {
  parseColomboFormDatetime,
  parseOptionalEndTime,
  toDatetimeLocalValue,
} from "@/lib/sessions/session-datetime-form";

export type EditSessionDetailsSession = {
  id: string;
  batchId: string;
  sessionNumber: number;
  scheduledAt: string;
  scheduledEndAt?: string | null;
  branchId: string;
  branchName?: string;
  status: string;
  pin?: string | null;
  notes?: string | null;
};

type EditSessionDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: EditSessionDetailsSession | null;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

export function EditSessionDetailsModal({
  open,
  onClose,
  onSuccess,
  session,
}: EditSessionDetailsModalProps) {
  const { branches } = useBranchesPicker();
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [clearPin, setClearPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    setScheduledAt(toDatetimeLocalValue(session.scheduledAt));
    setScheduledEndAt(
      session.scheduledEndAt ? toDatetimeLocalValue(session.scheduledEndAt) : "",
    );
    setBranchId(session.branchId);
    setNotes(session.notes ?? "");
    setPin(session.pin ?? "");
    setClearPin(false);
    setError(null);
  }, [open, session]);

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.branchCode})`,
  }));

  const canEdit =
    session &&
    session.status !== "COMPLETED" &&
    session.status !== "CANCELLED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !canEdit) return;

    const date = parseColomboFormDatetime(scheduledAt);
    if (isNaN(date.getTime())) {
      setError("Invalid date/time");
      return;
    }

    if (!branchId) {
      setError("Select a branch");
      return;
    }

    const { end: endDate, error: endError } = parseOptionalEndTime(
      scheduledAt,
      scheduledEndAt,
    );
    if (endError) {
      setError(endError);
      return;
    }

    if (!clearPin && pin.trim() && !/^\d{4}$/.test(pin.trim())) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateSession(session.batchId, session.id, {
        action: "update-details",
        scheduledAt: date.toISOString(),
        scheduledEndAt: endDate ? endDate.toISOString() : null,
        branchId,
        notes: notes.trim() || null,
        ...(clearPin ? { clearPin: true } : { pin: pin.trim() || null }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit session #${session.sessionNumber}`}
      size="md"
    >
      {!canEdit ? (
        <p className="text-sm text-neutral-600">
          Completed and cancelled sessions cannot be edited.
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <p className="text-sm text-neutral-600">
            Fix date, time, location, or notes without notifying students. Use{" "}
            <strong>Reschedule</strong> when you need to mark the session as
            rescheduled and optionally send SMS.
          </p>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Start date & time
            </span>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              End date & time{" "}
              <span className="normal-case text-neutral-500">(optional)</span>
            </span>
            <input
              type="datetime-local"
              value={scheduledEndAt}
              onChange={(e) => setScheduledEndAt(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-neutral-500">
              When set, students can mark attendance from start until end (plus
              the configured grace period).
            </p>
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Branch location
            </span>
            <Select
              value={branchId}
              onChange={setBranchId}
              options={branchOptions}
              aria-label="Branch location"
            />
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Notes <span className="normal-case text-neutral-500">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Internal notes for admins"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Attendance PIN
            </span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clearPin}
                onChange={(e) => setClearPin(e.target.checked)}
                className="size-4 rounded border-secondary-400"
              />
              Remove PIN
            </label>
            {!clearPin ? (
              <SessionPinField value={pin} onChange={setPin} />
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <SubmitButton loading={isSubmitting}>Save changes</SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
