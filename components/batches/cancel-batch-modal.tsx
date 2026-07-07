"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { cancelBatch } from "@/lib/api/batches";

type CancelBatchModalProps = {
  open: boolean;
  batchId: string;
  batchName: string;
  enrollmentCount: number;
  onClose: () => void;
  onSuccess: (droppedCount: number) => void;
};

export function CancelBatchModal({
  open,
  batchId,
  batchName,
  enrollmentCount,
  onClose,
  onSuccess,
}: CancelBatchModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await cancelBatch(batchId);
      onSuccess(result.droppedEnrollmentCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel batch");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cancel batch" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Cancel <span className="font-medium text-primary-900">{batchName}</span>?
          Scheduled sessions will be cancelled
          {enrollmentCount > 0 ? (
            <>
              {" "}
              and{" "}
              <span className="font-medium">
                {enrollmentCount} active student
                {enrollmentCount === 1 ? "" : "s"}
              </span>{" "}
              will be dropped from this batch (not added to alumni).
            </>
          ) : (
            "."
          )}
        </p>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-secondary-300 px-4 py-2.5 text-sm font-medium text-neutral-800 disabled:opacity-60"
          >
            Keep batch
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Cancelling…"
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => void handleConfirm()}
          >
            Cancel batch
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
