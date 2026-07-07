"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateInstallment } from "@/lib/api/payments";
import { formatMoney } from "@/lib/format/money";
import type { InstallmentListItem } from "@/types/api/payment";

export type EditInstallmentTarget = Pick<
  InstallmentListItem,
  | "installmentId"
  | "label"
  | "dueDate"
  | "amount"
  | "paidAmount"
  | "status"
  | "studentName"
>;

type EditInstallmentModalProps = {
  open: boolean;
  target: EditInstallmentTarget | null;
  onClose: () => void;
  onSuccess: () => void;
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function EditInstallmentModal({
  open,
  target,
  onClose,
  onSuccess,
}: EditInstallmentModalProps) {
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [overdueAsOfToday, setOverdueAsOfToday] = useState(false);
  const [initialDueDate, setInitialDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPaid = target?.status === "PAID";
  const dueDateChanged = target ? dueDate !== initialDueDate : false;

  useEffect(() => {
    if (open && target) {
      setLabel(target.label);
      const d = toDateInputValue(target.dueDate);
      setDueDate(d);
      setInitialDueDate(d);
      setAmount(String(target.amount));
      setOverdueAsOfToday(false);
      setError(null);
    }
  }, [open, target]);

  async function handleSubmit() {
    if (!target) return;

    const parsedAmount = Number(amount);
    if (!isPaid && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!isPaid && parsedAmount + 0.001 < target.paidAmount) {
      setError(
        `Amount cannot be less than already paid (${formatMoney(target.paidAmount, "LKR")})`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateInstallment(target.installmentId, {
        label: label.trim(),
        ...(!isPaid
          ? {
              dueDate: new Date(dueDate).toISOString(),
              amount: parsedAmount,
              ...(dueDateChanged
                ? {
                    overdueAsOf: overdueAsOfToday ? "today" : "payment_date",
                  }
                : {}),
            }
          : {}),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update instalment");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!target) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit instalment — ${target.studentName}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          Update schedule or label for <strong>{target.label}</strong>. Amount cannot
          be less than{" "}
          <strong>{formatMoney(target.paidAmount, "LKR")}</strong> already paid.
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Label
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-secondary-300/60 px-3 text-sm"
          />
        </label>

        {!isPaid ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
                Due date
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 px-3 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
                Amount (LKR)
              </span>
              <input
                type="number"
                min={target.paidAmount}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 px-3 text-sm"
              />
            </label>

            {dueDateChanged ? (
              <div className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 px-3 py-3">
                <p className="text-xs text-neutral-600">
                  Overdue fees are rechecked using the latest payment date on this
                  instalment (same as when recording a payment). Use the option below
                  only for corrections that should use today&apos;s date.
                </p>
                <label className="mt-2 flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={overdueAsOfToday}
                    onChange={(e) => setOverdueAsOfToday(e.target.checked)}
                    className="mt-1 size-4 rounded border-secondary-400"
                  />
                  <span className="text-sm text-neutral-700">
                    Apply overdue check as of today (not payment date)
                  </span>
                </label>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This instalment is fully paid — only the label can be changed.
          </p>
        )}

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
            loadingText="Saving…"
            onClick={() => void handleSubmit()}
          >
            Save changes
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
