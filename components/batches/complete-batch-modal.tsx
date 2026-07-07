"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { graduateBatch } from "@/lib/api/batches";

type CompleteBatchModalProps = {
  open: boolean;
  batchId: string;
  batchName: string;
  activeStudentCount: number;
  onClose: () => void;
  onSuccess: (promotedCount: number) => void;
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CompleteBatchModal({
  open,
  batchId,
  batchName,
  activeStudentCount,
  onClose,
  onSuccess,
}: CompleteBatchModalProps) {
  const [graduatedAt, setGraduatedAt] = useState(todayIsoDate);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!graduatedAt) {
      setError("Graduation date is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await graduateBatch(batchId, graduatedAt);
      onSuccess(result.promotedCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete batch");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Complete batch" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Mark <span className="font-medium text-primary-900">{batchName}</span> as
          completed and promote{" "}
          {activeStudentCount > 0 ? (
            <span className="font-medium">
              {activeStudentCount} active student
              {activeStudentCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="font-medium">eligible students</span>
          )}{" "}
          to alumni. Portal login will be disabled for promoted students.
        </p>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-primary-900">
            Graduation date <span className="text-destructive">*</span>
          </span>
          <input
            type="date"
            value={graduatedAt}
            onChange={(e) => setGraduatedAt(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm text-primary-900"
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-secondary-300 px-4 py-2.5 text-sm font-medium text-neutral-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Completing…"
            onClick={() => void handleSubmit()}
          >
            Complete & promote
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
