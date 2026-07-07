"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteBatch } from "@/lib/api/batches";

type DeleteBatchModalProps = {
  open: boolean;
  batchId: string;
  batchName: string;
  batchCode: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteBatchModal({
  open,
  batchId,
  batchName,
  batchCode,
  onClose,
  onSuccess,
}: DeleteBatchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteBatch(batchId);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete batch");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete batch" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Permanently delete{" "}
          <span className="font-medium text-primary-900">{batchName}</span>{" "}
          <span className="font-mono text-xs text-neutral-500">({batchCode})</span>?
        </p>
        <p className="text-sm text-neutral-600">
          All sessions and instalment templates for this batch will be permanently
          removed. Student enrolment records and payment history are kept. This
          cannot be undone.
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
            loadingText="Deleting…"
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => void handleDelete()}
          >
            Delete batch
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
