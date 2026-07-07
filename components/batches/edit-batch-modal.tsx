"use client";

import { useEffect, useState } from "react";

import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateBatch } from "@/lib/api/batches";
import { formatMoney } from "@/lib/format/money";
import type { BatchDetail, BatchStatus, UpdateBatchBody } from "@/types/api/batch";

type EditBatchModalProps = {
  open: boolean;
  onClose: () => void;
  batch: BatchDetail;
  onSuccess: (message?: string) => void;
  currency?: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

const STATUS_LABELS: Record<BatchStatus, string> = {
  OPEN: "Registration open",
  ACTIVE: "Active (registrations closed)",
  COMPLETED: "Completed",
  CLOSED: "Cancelled",
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function editableStatusOptions(current: BatchStatus) {
  if (current === "COMPLETED") return [];

  const options: { value: BatchStatus; label: string }[] = [
    { value: "OPEN", label: STATUS_LABELS.OPEN },
  ];

  if (current === "OPEN") {
    options.push({ value: "ACTIVE", label: STATUS_LABELS.ACTIVE });
  }

  if (current === "ACTIVE") {
    return [{ value: "OPEN", label: STATUS_LABELS.OPEN }];
  }

  return options;
}

export function EditBatchModal({
  open,
  onClose,
  batch,
  onSuccess,
  currency = "LKR",
}: EditBatchModalProps) {
  const [endDate, setEndDate] = useState(toDateInputValue(batch.endDate));
  const [courseFee, setCourseFee] = useState(String(batch.courseFee));
  const [registrationFee, setRegistrationFee] = useState(
    String(batch.registrationFee),
  );
  const [status, setStatus] = useState<BatchStatus>(batch.status);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = editableStatusOptions(batch.status);

  useEffect(() => {
    if (!open) return;
    setEndDate(toDateInputValue(batch.endDate));
    setCourseFee(String(batch.courseFee));
    setRegistrationFee(String(batch.registrationFee));
    setStatus(batch.status);
    setError(null);
  }, [open, batch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body: UpdateBatchBody = {};
    const nextEnd = endDate.trim();
    if (nextEnd && nextEnd !== toDateInputValue(batch.endDate)) {
      body.endDate = nextEnd;
    }

    const nextCourse = Number(courseFee);
    if (!Number.isNaN(nextCourse) && nextCourse !== batch.courseFee) {
      body.courseFee = nextCourse;
    }

    const nextReg = Number(registrationFee);
    if (!Number.isNaN(nextReg) && nextReg !== batch.registrationFee) {
      body.registrationFee = nextReg;
    }

    if (status !== batch.status && statusOptions.some((o) => o.value === status)) {
      body.status = status;
    }

    if (Object.keys(body).length === 0) {
      setError("No changes to save");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await updateBatch(batch.id, body);
      const parts = ["Batch updated."];
      if (result.warnings?.length) {
        parts.push(result.warnings.join(" "));
      }
      onSuccess(parts.join(" "));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit batch" size="md">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <span>{batch.batchCode}</span>
          <span>·</span>
          <span>starts {new Date(batch.startDate).toLocaleDateString()}</span>
          <BatchStatusBadge status={batch.status} />
        </div>

        {statusOptions.length > 0 ? (
          <div className="space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Status
            </span>
            <Select
              value={status}
              onChange={(v) => setStatus(v as BatchStatus)}
              options={statusOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Batch status"
            />
            <p className="text-xs text-neutral-500">
              Set to Registration open to accept new students again. Completed batches
              cannot be reopened.
            </p>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            End date
          </span>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-neutral-500">
            Shrinking the end date shows a warning if sessions fall outside the
            range; sessions are not moved automatically.
          </p>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Course fee ({currency})
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={courseFee}
            onChange={(e) => setCourseFee(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Registration fee ({currency})
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={registrationFee}
            onChange={(e) => setRegistrationFee(e.target.value)}
            className={inputClass}
          />
        </label>

        <p className="text-xs text-neutral-500">
          Current course fee: {formatMoney(batch.courseFee, currency)}
        </p>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <SubmitButton loading={isSubmitting}>Save</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
