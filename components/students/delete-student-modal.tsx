"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteStudent } from "@/lib/api/students";

type DeleteStudentModalProps = {
  open: boolean;
  studentId: string;
  studentName: string;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteStudentModal({
  open,
  studentId,
  studentName,
  email,
  onClose,
  onSuccess,
}: DeleteStudentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteStudent(studentId);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete student");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete student" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Permanently delete <strong>{studentName}</strong> ({email})? This cannot
          be undone.
        </p>
        <p className="text-sm text-neutral-600">
          Deletion is blocked if the student has payments, invoices, alumni records,
          or batch transfer history. Enrollments and attendance are removed
          automatically when allowed.
        </p>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Deleting…"
            onClick={() => void handleDelete()}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete student
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
