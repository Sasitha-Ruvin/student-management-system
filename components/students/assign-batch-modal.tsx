"use client";

import { useEffect, useMemo, useState } from "react";

import { PaymentStructureEditor } from "@/components/payments/payment-structure-editor";
import { StudentAvatar } from "@/components/students/student-avatar";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { assignStudentToBatch } from "@/lib/api/students";
import { fetchBatches } from "@/lib/api/batches";
import { filterAdminEnrollableBatches } from "@/lib/batches/admin-enrollable-batches";
import { needsModelCodeOnApproval } from "@/lib/students/student-source";
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

type AssignBatchModalProps = {
  open: boolean;
  student: StudentListItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function AssignBatchModal({
  open,
  student,
  onClose,
  onSuccess,
}: AssignBatchModalProps) {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [payment, setPayment] = useState<PaymentStructureValue>(initialPaymentStructure);
  const [regFeePaid, setRegFeePaid] = useState(false);
  const [modelCode, setModelCode] = useState("");
  const [loadingModelCode, setLoadingModelCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresModelCode = needsModelCodeOnApproval(student.source, student.modelCode);

  useEffect(() => {
    if (!open) return;
    setBatchId("");
    setPayment(initialPaymentStructure());
    setRegFeePaid(false);
    setModelCode("");
    setError(null);
    setLoadingBatches(true);
    void fetchBatches({ status: "all", limit: 100 })
      .then((page) => setBatches(filterAdminEnrollableBatches(page.items)))
      .catch(() => setError("Failed to load batches"))
      .finally(() => setLoadingBatches(false));
  }, [open]);

  useEffect(() => {
    if (!open || !requiresModelCode) return;
    setLoadingModelCode(true);
    void fetch("/api/students/model-code/next")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load model code");
        const json = (await res.json()) as { data?: { modelCode?: string } };
        setModelCode(json.data?.modelCode ?? "");
      })
      .catch(() => setError("Could not suggest a model code"))
      .finally(() => setLoadingModelCode(false));
  }, [open, requiresModelCode, student.id]);

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
    label: `${b.batchCode} — ${b.branchName} — ${b.startDate.slice(0, 10)} to ${b.endDate.slice(0, 10)} — ${b.enrollmentCount} enrolled`,
  }));

  async function handleSubmit() {
    if (!batchId) {
      setError("Select a batch");
      return;
    }
    if (requiresModelCode && !modelCode.trim()) {
      setError("Model code is required for website applicants");
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
      await assignStudentToBatch(
        student.id,
        {
          ...paymentStructureToAssignBody(batchId, payment, { regFeePaid }),
          customCourseFee,
          ...(requiresModelCode ? { modelCode: modelCode.trim() } : {}),
        },
      );
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign to batch" size="xl">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-secondary-300/50 bg-secondary-100/30 p-4">
          <div className="mx-auto flex justify-center">
            <StudentAvatar
              studentId={student.id}
              fullName={student.fullName}
              photoUrl={student.photoUrl}
              size="lg"
            />
          </div>
          <p className="text-center font-headline text-lg text-primary-900">
            {student.fullName}
          </p>
          <p className="text-center font-mono text-sm text-neutral-600">
            {student.modelCode}
          </p>
          <p className="text-center text-sm text-neutral-600">{student.email}</p>
          {student.preferredBranchName || student.preferredBranchRaw ? (
            <p className="text-center text-xs text-neutral-500">
              Preferred: {student.preferredBranchName ?? student.preferredBranchRaw}
              {student.preferredDate ? ` · ${student.preferredDate}` : ""}
            </p>
          ) : null}
          {requiresModelCode ? (
            <p className="rounded-lg border border-violet-300/50 bg-violet-50 px-3 py-2 text-center text-xs text-violet-900">
              Website application — assign a model code when approving.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {requiresModelCode ? (
            <div className="space-y-1">
              <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
                Model code
              </span>
              <input
                type="text"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder={loadingModelCode ? "Loading suggestion…" : "MOD-2026-00001"}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm text-primary-900"
              />
              <p className="text-xs text-neutral-500">
                Replaces temporary code {student.modelCode}.
              </p>
            </div>
          ) : null}

          {loadingBatches ? (
            <p className="text-sm text-neutral-600">Loading batches…</p>
          ) : batchOptions.length === 0 ? (
            <p className="text-sm text-destructive">
              No open or active batches available. Create a batch first.
            </p>
          ) : (
            <div className="space-y-1">
              <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
                Batch
              </span>
              <Select
                value={batchId}
                onChange={setBatchId}
                options={[{ value: "", label: "Select batch…" }, ...batchOptions]}
                aria-label="Batch"
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
            Marks intent only. Record payment from the student profile to
            generate an invoice.
          </p>

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
              loadingText="Assigning…"
              onClick={() => void handleSubmit()}
              disabled={batchOptions.length === 0}
            >
              Assign student
            </SubmitButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
