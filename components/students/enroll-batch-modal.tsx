"use client";

import { useEffect, useMemo, useState } from "react";

import { PaymentStructureEditor } from "@/components/payments/payment-structure-editor";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { fetchBatches } from "@/lib/api/batches";
import { filterAdminEnrollableBatches } from "@/lib/batches/admin-enrollable-batches";
import { enrollStudentInBatch } from "@/lib/api/students";
import {
  paymentStructureToAssignBody,
  validatePaymentStructure,
} from "@/lib/payments/enrollment-payment-fields";
import { resolveEnrollmentCourseFee } from "@/lib/payments/resolve-enrollment-course-fee";
import {
  initialPaymentStructure,
  type PaymentStructureValue,
} from "@/types/api/payment-enrollment";
import type { BatchListItem } from "@/types/api/batch";
import type { StudentListItem } from "@/types/api/student";

type EnrollBatchModalProps = {
  open: boolean;
  student: StudentListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function EnrollBatchModal({
  open,
  student,
  onClose,
  onSuccess,
}: EnrollBatchModalProps) {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [payment, setPayment] = useState<PaymentStructureValue>(initialPaymentStructure);
  const [regFeePaid, setRegFeePaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBatchId("");
    setPayment(initialPaymentStructure());
    setRegFeePaid(false);
    setNotes("");
    setError(null);
    setLoadingBatches(true);
    void fetchBatches({ status: "all", limit: 100 })
      .then((page) => setBatches(filterAdminEnrollableBatches(page.items)))
      .catch(() => setError("Failed to load batches"))
      .finally(() => setLoadingBatches(false));
  }, [open]);

  useEffect(() => {
    if (!batchId) return;
    setPayment(initialPaymentStructure());
  }, [batchId]);

  const sortedBatches = useMemo(() => {
    const preferred = student.preferredBranchId;
    return [...batches].sort((a, b) => {
      if (preferred) {
        if (a.branchId === preferred && b.branchId !== preferred) return -1;
        if (b.branchId === preferred && a.branchId !== preferred) return 1;
      }
      return a.batchCode.localeCompare(b.batchCode);
    });
  }, [batches, student.preferredBranchId]);

  const batchOptions = sortedBatches.map((b) => ({
    value: b.id,
    label: `${b.batchCode} — ${b.branchName} — ${b.status}`,
  }));

  async function handleSubmit() {
    if (!batchId) {
      setError("Select a batch");
      return;
    }
    const validationError = validatePaymentStructure(payment);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const customCourseFee = resolveEnrollmentCourseFee(
        payment.paymentPath,
        payment.customCourseFee,
        null,
      );
      await enrollStudentInBatch(student.id, {
        ...paymentStructureToAssignBody(batchId, payment, {
          regFeePaid,
          notes: notes.trim() || undefined,
        }),
        customCourseFee,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Enroll in batch" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Creates a <span className="font-medium">new enrollment</span> for{" "}
          <span className="font-medium">{student.fullName}</span>. Previous dropped
          enrollments stay in history. Unpaid instalments on old enrollments are not
          moved.
        </p>
        <p className="rounded-xl border border-secondary-300/60 bg-secondary-50 px-3 py-2 text-sm text-neutral-700">
          <span className="font-medium">Occasional cross-branch visit?</span> You do
          not need a second enrollment — open the session&apos;s attendance page and
          use <span className="font-medium">Guest student</span> to mark them for
          that session only.
        </p>

        {loadingBatches ? (
          <p className="text-sm text-neutral-600">Loading batches…</p>
        ) : batchOptions.length === 0 ? (
          <p className="text-sm text-destructive">No open or active batches available.</p>
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Target batch
            </span>
            <Select
              value={batchId}
              onChange={setBatchId}
              options={[{ value: "", label: "Select batch…" }, ...batchOptions]}
              aria-label="Target batch"
            />
          </div>
        )}

        <PaymentStructureEditor
          batchId={batchId || null}
          value={payment}
          onChange={setPayment}
        />

        <label className="flex min-h-11 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={regFeePaid}
            onChange={(e) => setRegFeePaid(e.target.checked)}
            className="size-4 rounded border-secondary-400"
          />
          <span className="text-sm text-primary-900">Registration fee paid</span>
        </label>
        <p className="text-xs text-neutral-500">
          Marks intent only. Record payment from the student profile to generate
          an invoice.
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Enrolling…"
            onClick={() => void handleSubmit()}
            disabled={batchOptions.length === 0}
          >
            Enroll student
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
