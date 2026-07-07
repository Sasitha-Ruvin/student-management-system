"use client";

import { useEffect, useMemo, useState } from "react";

import { PaymentStructureEditor } from "@/components/payments/payment-structure-editor";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  fetchBatches,
  fetchTransferBalancePreview,
  updateEnrollment,
} from "@/lib/api/batches";
import { filterAdminEnrollableBatches } from "@/lib/batches/admin-enrollable-batches";
import { formatMoney } from "@/lib/format/money";
import {
  paymentStructureToAssignBody,
  validatePaymentStructure,
} from "@/lib/payments/enrollment-payment-fields";
import { resolveEnrollmentCourseFee } from "@/lib/payments/resolve-enrollment-course-fee";
import {
  initialPaymentStructure,
  type PaymentStructureValue,
} from "@/types/api/payment-enrollment";
import type {
  BatchListItem,
  BatchStudentRow,
  TransferBalancePreview,
  TransferSettlementKind,
} from "@/types/api/batch";

type TransferBatchModalProps = {
  open: boolean;
  sourceBatchId: string;
  student: BatchStudentRow;
  onClose: () => void;
  onSuccess: () => void;
};

const SETTLEMENT_OPTIONS: {
  kind: TransferSettlementKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "APPLY_TO_NEW",
    label: "Apply credit to new plan",
    description:
      "Reduces new instalment amounts (first instalment first). Can mark registration fee paid if credit covers it.",
  },
  {
    kind: "CREDIT_NOTE",
    label: "Credit note (document only)",
    description:
      "Records credit owed; new plan unchanged. Honour manually via payments or instalment edits.",
  },
  {
    kind: "REFUND_RECORD",
    label: "Refund record",
    description:
      "Audit that a refund was or will be issued. Payments stay on the dropped enrollment.",
  },
  {
    kind: "MANUAL_ADJUSTMENT",
    label: "Manual adjustment on new plan",
    description:
      "You adjust the new payment structure below; no automatic credit application.",
  },
];

export function TransferBatchModal({
  open,
  sourceBatchId,
  student,
  onClose,
  onSuccess,
}: TransferBatchModalProps) {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [balance, setBalance] = useState<TransferBalancePreview | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [payment, setPayment] = useState<PaymentStructureValue>(initialPaymentStructure);
  const [regFeePaid, setRegFeePaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [settlementKind, setSettlementKind] =
    useState<TransferSettlementKind>("APPLY_TO_NEW");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargetBatchId("");
    setPayment(initialPaymentStructure());
    setRegFeePaid(false);
    setNotes("");
    setSettlementKind("APPLY_TO_NEW");
    setSettlementAmount("");
    setSettlementNotes("");
    setError(null);
    setBalance(null);

    setLoadingBatches(true);
    setLoadingBalance(true);
    void fetchBatches({ status: "all", limit: 100 })
      .then((page) =>
        setBatches(
          filterAdminEnrollableBatches(page.items).filter(
            (b) => b.id !== sourceBatchId,
          ),
        ),
      )
      .catch(() => setError("Failed to load batches"))
      .finally(() => setLoadingBatches(false));

    void fetchTransferBalancePreview(sourceBatchId, student.enrollmentId)
      .then((preview) => {
        setBalance(preview);
        setSettlementAmount(String(Math.round(preview.totalCollected)));
      })
      .catch(() => setError("Failed to load payment balance"))
      .finally(() => setLoadingBalance(false));
  }, [open, sourceBatchId, student.enrollmentId]);

  useEffect(() => {
    if (!targetBatchId) return;
    setPayment(initialPaymentStructure());
  }, [targetBatchId]);

  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        value: b.id,
        label: `${b.batchCode} — ${b.branchName} — ${b.status}`,
      })),
    [batches],
  );

  const hasCollected = (balance?.totalCollected ?? 0) > 0.001;
  const parsedSettlementAmount = Number(settlementAmount);

  async function handleSubmit() {
    if (!targetBatchId) {
      setError("Select a target batch");
      return;
    }
    const validationError = validatePaymentStructure(payment);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (hasCollected) {
      if (!Number.isFinite(parsedSettlementAmount) || parsedSettlementAmount < 0.01) {
        setError("Enter a valid settlement amount");
        return;
      }
      if (parsedSettlementAmount > (balance?.totalCollected ?? 0) + 0.01) {
        setError("Settlement amount cannot exceed collected total");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const assignBody = paymentStructureToAssignBody(targetBatchId, payment, {
        regFeePaid,
        notes: notes.trim() || undefined,
      });
      const customCourseFee = resolveEnrollmentCourseFee(
        payment.paymentPath,
        payment.customCourseFee,
        null,
      );
      await updateEnrollment(sourceBatchId, student.enrollmentId, {
        action: "transfer",
        targetBatchId,
        paymentPath: assignBody.paymentPath,
        installmentSource: assignBody.installmentSource,
        paymentPlanId: assignBody.paymentPlanId,
        customInstallments: assignBody.customInstallments,
        customCourseFee,
        regFeePaid: assignBody.regFeePaid,
        notes: assignBody.notes,
        settlement: hasCollected
          ? {
              kind: settlementKind,
              amount: parsedSettlementAmount,
              notes: settlementNotes.trim() || undefined,
            }
          : undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Transfer — ${student.fullName}`}
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          The current enrollment is marked <span className="font-medium">dropped</span>.
          Unpaid instalments are cancelled. Recorded payments remain on the old enrollment
          for audit.
        </p>

        {loadingBalance ? (
          <p className="text-sm text-neutral-600">Loading balance on current enrollment…</p>
        ) : balance ? (
          <div className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 p-4 text-sm">
            <p className="font-medium text-primary-900">
              Collected on {balance.sourceBatchCode}
            </p>
            <dl className="mt-2 grid gap-1 sm:grid-cols-2">
              <div>
                <dt className="text-neutral-600">Instalments + overdue fees</dt>
                <dd className="font-medium">
                  {formatMoney(balance.installmentCollected, "LKR")}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-600">Registration fee</dt>
                <dd className="font-medium">
                  {balance.registrationFeeCollected > 0
                    ? formatMoney(balance.registrationFeeCollected, "LKR")
                    : balance.regFeePaid
                      ? "Marked paid (no payment row)"
                      : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-600">Total collected (transferable credit)</dt>
                <dd className="text-base font-semibold text-primary-900">
                  {formatMoney(balance.totalCollected, "LKR")}
                </dd>
              </div>
              {balance.cancelledUnpaidTotal > 0.001 ? (
                <div className="sm:col-span-2">
                  <dt className="text-neutral-600">Unpaid instalments being cancelled</dt>
                  <dd>{formatMoney(balance.cancelledUnpaidTotal, "LKR")}</dd>
                </div>
              ) : null}
            </dl>
            {balance.installments.some((i) => i.paidAmount > 0 || i.overdueFeePaid > 0) ? (
              <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-neutral-600">
                {balance.installments
                  .filter((i) => i.paidAmount > 0 || i.overdueFeePaid > 0)
                  .map((i) => (
                    <li key={i.installmentId}>
                      {i.label}: {formatMoney(i.paidAmount + i.overdueFeePaid, "LKR")} paid
                      {i.willCancel ? " · will cancel" : ""}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {hasCollected ? (
          <fieldset className="space-y-3 rounded-xl border border-secondary-300/60 p-4">
            <legend className="px-1 text-sm font-medium text-primary-900">
              Handle collected payments
            </legend>
            <div className="space-y-2">
              {SETTLEMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.kind}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    settlementKind === opt.kind
                      ? "border-primary-500 bg-primary-50/30"
                      : "border-secondary-300/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="settlement"
                    checked={settlementKind === opt.kind}
                    onChange={() => setSettlementKind(opt.kind)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-primary-900">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-neutral-600">
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="font-medium text-primary-900">Amount (LKR)</span>
              <input
                type="number"
                min={0}
                max={balance?.totalCollected}
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-secondary-300/60 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-primary-900">Settlement notes (optional)</span>
              <textarea
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-secondary-300/60 px-3 py-2 text-sm"
                placeholder="e.g. Refund via bank transfer ref #123"
              />
            </label>
          </fieldset>
        ) : null}

        {loadingBatches ? (
          <p className="text-sm text-neutral-600">Loading batches…</p>
        ) : batchOptions.length === 0 ? (
          <p className="text-sm text-destructive">No other open or active batches available.</p>
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Target batch
            </span>
            <Select
              value={targetBatchId}
              onChange={setTargetBatchId}
              options={[{ value: "", label: "Select batch…" }, ...batchOptions]}
              aria-label="Target batch"
            />
          </div>
        )}

        <PaymentStructureEditor
          batchId={targetBatchId || null}
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
          <span className="text-sm text-primary-900">Registration fee paid (new batch)</span>
        </label>
        <p className="text-xs text-neutral-500">
          For &quot;Apply credit&quot;, leave unchecked if credit should cover the new batch
          registration fee.
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
            loadingText="Transferring…"
            onClick={() => void handleSubmit()}
            disabled={batchOptions.length === 0}
          >
            Transfer student
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
