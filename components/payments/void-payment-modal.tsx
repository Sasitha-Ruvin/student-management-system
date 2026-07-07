"use client";

import { useState } from "react";

import { voidPaymentApi } from "@/lib/api/payments";
import type { PaymentHistoryItem, VoidPaymentResult } from "@/types/api/payment";

type VoidPaymentModalProps = {
  payment: PaymentHistoryItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (result: VoidPaymentResult, message?: string) => void;
};

export function VoidPaymentModal({
  payment,
  open,
  onClose,
  onSuccess,
}: VoidPaymentModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open || !payment) return null;

  async function handleSubmit() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Please enter a reason (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const { data, message } = await voidPaymentApi(payment!.paymentId, reason.trim());
      setReason("");
      onSuccess(data, message);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to void payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-payment-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-tertiary-100 p-6 shadow-xl">
        <h2
          id="void-payment-title"
          className="font-headline text-xl text-primary-900"
        >
          Void payment
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          This will reverse the payment on the instalment balance. The invoice
          will no longer be downloadable. You can record a corrected payment
          afterward.
        </p>
        <div className="mt-3 rounded-lg bg-secondary-100/60 px-3 py-2 text-sm">
          <p>
            <span className="text-neutral-600">Invoice: </span>
            <span className="font-mono">{payment.invoiceNumber || "—"}</span>
          </p>
          <p>
            <span className="text-neutral-600">Amount: </span>
            LKR {payment.amount.toLocaleString()}
          </p>
        </div>

        <label className="mt-4 block text-sm font-medium text-primary-900">
          Reason for voiding
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 py-2 text-sm"
            placeholder="e.g. Wrong amount recorded"
          />
        </label>

        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl border border-secondary-400 px-4 text-sm text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl bg-destructive px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Voiding…" : "Void payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
