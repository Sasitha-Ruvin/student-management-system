"use client";

import { useEffect, useState } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import { UnderlineField } from "@/components/ui/underline-field";
import { UnderlineSelect } from "@/components/ui/underline-select";
import { ReceiptDeliveryOptions } from "@/components/payments/receipt-delivery-options";
import {
  fetchReceiptDeliveryContext,
  recordRegistrationPayment,
} from "@/lib/api/payments";
import type { ReceiptDeliveryContext } from "@/lib/payments/notify-payment-receipts";
import { formatMoney } from "@/lib/format/money";
import type { PaymentMethod } from "@/types/api/payment";

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export type RegistrationFeeTarget = {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  batchCode: string | null;
  registrationFee: number;
};

export type RecordRegistrationFeeSuccess = {
  message: string;
  paymentId: string;
  invoiceNumber: string;
};

type RecordRegistrationFeeDrawerProps = {
  open: boolean;
  onClose: () => void;
  target: RegistrationFeeTarget | null;
  onSuccess: (info: RecordRegistrationFeeSuccess) => void;
};

export function RecordRegistrationFeeDrawer({
  open,
  onClose,
  target,
  onSuccess,
}: RecordRegistrationFeeDrawerProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [deliveryContext, setDeliveryContext] =
    useState<ReceiptDeliveryContext | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(String(target.registrationFee));
    setMethod("CASH");
    setReference("");
    setNotes("");
    setSendEmail(true);
    setSendSms(false);
    setDeliveryContext(null);
    setDeliveryLoading(true);
    setErrors({});
    void fetchReceiptDeliveryContext(target.studentId)
      .then((ctx) => {
        setDeliveryContext(ctx);
        setSendEmail(ctx.emailConfigured);
        setSendSms(false);
      })
      .catch(() => setDeliveryContext(null))
      .finally(() => setDeliveryLoading(false));
  }, [open, target]);

  if (!target) return null;

  const feeTarget = target;
  const amountNum = Number(amount);
  const maxFee = feeTarget.registrationFee;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      next.amount = "Amount must be greater than 0";
    } else if (amountNum > maxFee + 0.001) {
      next.amount = `Amount cannot exceed ${formatMoney(maxFee, "LKR")}`;
    }
    if (!paymentDate) {
      next.paymentDate = "Payment date is required";
    }
    if (!method) {
      next.method = "Select a payment method";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await recordRegistrationPayment({
        studentId: feeTarget.studentId,
        enrollmentId: feeTarget.enrollmentId,
        amount: amountNum,
        paymentDate,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        sendEmail,
        sendSms,
      });
      onSuccess({
        message: result.warning
          ? `Registration fee recorded. ${result.warning}`
          : "Registration fee recorded successfully",
        paymentId: result.payment.paymentId,
        invoiceNumber: result.payment.invoiceNumber,
      });
      onClose();
    } catch (err) {
      const e = err as Error & { errors?: Record<string, string> };
      if (e.errors) {
        setErrors(e.errors);
      } else {
        setErrors({ form: e.message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Record registration fee"
      subtitle={`${feeTarget.studentName}${feeTarget.batchCode ? ` · ${feeTarget.batchCode}` : ""}`}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <p className="text-sm text-neutral-600">
          Creates a payment and invoice. The enrollment will be marked as
          registration fee paid.
        </p>

        <div className="rounded-xl border border-secondary-300/50 bg-secondary-100/40 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Batch registration fee</span>
            <span className="font-medium text-primary-900">
              {formatMoney(maxFee, "LKR")}
            </span>
          </div>
        </div>

        {errors.form ? (
          <p className="text-sm text-destructive">{errors.form}</p>
        ) : null}

        <UnderlineField
          label="Amount (LKR)"
          type="number"
          min={0}
          max={maxFee}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />

        <UnderlineField
          label="Payment date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          error={errors.paymentDate}
        />

        <UnderlineSelect
          label="Method"
          value={method}
          onChange={(v) => setMethod(v as PaymentMethod)}
          options={METHOD_OPTIONS}
          error={errors.method}
        />

        <UnderlineField
          label="Reference (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <UnderlineField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <ReceiptDeliveryOptions
          sendEmail={sendEmail}
          onSendEmailChange={setSendEmail}
          sendSms={sendSms}
          onSendSmsChange={setSendSms}
          studentEmail={deliveryContext?.studentEmail ?? null}
          smsPhone={deliveryContext?.smsPhone ?? null}
          smsPhoneValid={deliveryContext?.smsPhoneValid ?? false}
          emailConfigured={deliveryContext?.emailConfigured ?? false}
          smsConfigured={deliveryContext?.smsConfigured ?? false}
          loading={deliveryLoading}
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl border border-secondary-400 px-4 text-sm text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl bg-primary-900 px-4 text-sm font-medium text-tertiary-100 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Record payment"}
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
