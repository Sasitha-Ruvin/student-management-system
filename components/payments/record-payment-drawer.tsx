"use client";

import { useEffect, useState } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import { UnderlineField } from "@/components/ui/underline-field";
import { UnderlineSelect } from "@/components/ui/underline-select";
import { ReceiptDeliveryOptions } from "@/components/payments/receipt-delivery-options";
import {
  fetchReceiptDeliveryContext,
  fetchStudentInstallments,
  recordPayment,
} from "@/lib/api/payments";
import type { ReceiptDeliveryContext } from "@/lib/payments/notify-payment-receipts";
import { formatMoney } from "@/lib/format/money";
import { planPaymentCascade } from "@/lib/payments/payment-cascade-plan";
import { computeOverdueChargeForRemainder } from "@/lib/payments/overdue-charge";
import type { InstallmentListItem, PaymentMethod } from "@/types/api/payment";

export type RecordPaymentTarget = Pick<
  InstallmentListItem,
  | "enrollmentId"
  | "studentId"
  | "installmentId"
  | "studentName"
  | "label"
  | "dueDate"
  | "status"
  | "amount"
  | "paidAmount"
  | "overdueCharge"
  | "overdueChargeWaived"
  | "baseRemaining"
  | "feeRemaining"
  | "totalRemaining"
>;

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export type RecordPaymentSuccessInvoice = {
  paymentId: string;
  invoiceNumber: string;
  label?: string | null;
};

export type RecordPaymentSuccess = {
  message: string;
  paymentId: string;
  invoiceNumber: string;
  invoices: RecordPaymentSuccessInvoice[];
};

type PaymentAmountMode = "full" | "custom";

type RecordPaymentDrawerProps = {
  open: boolean;
  onClose: () => void;
  target: RecordPaymentTarget | null;
  onSuccess: (info: RecordPaymentSuccess) => void;
  overdueChargeAmount?: number;
  overdueChargeEnabled?: boolean;
};

function startOfDay(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(value) : new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function RecordPaymentDrawer({
  open,
  onClose,
  target,
  onSuccess,
  overdueChargeAmount = 0,
  overdueChargeEnabled = false,
}: RecordPaymentDrawerProps) {
  const [amount, setAmount] = useState("");
  const [amountMode, setAmountMode] = useState<PaymentAmountMode>("full");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [deliveryContext, setDeliveryContext] =
    useState<ReceiptDeliveryContext | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [waiveOverdueCharge, setWaiveOverdueCharge] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [siblingInstallments, setSiblingInstallments] = useState<
    InstallmentListItem[]
  >([]);

  const isLatePayment =
    target !== null &&
    paymentDate.length > 0 &&
    startOfDay(paymentDate) > startOfDay(target.dueDate);

  const hasOverdueFee =
    target !== null &&
    !target.overdueChargeWaived &&
    (target.feeRemaining > 0 || target.overdueCharge > 0);

  const willBeCharged =
    target !== null &&
    !hasOverdueFee &&
    !target.overdueChargeWaived &&
    overdueChargeEnabled &&
    overdueChargeAmount > 0 &&
    isLatePayment &&
    target.baseRemaining > 0;

  const anyOverdue = hasOverdueFee || willBeCharged;

  const pendingCharge =
    willBeCharged && target
      ? computeOverdueChargeForRemainder(
          overdueChargeAmount,
          target.amount,
          target.baseRemaining,
        )
      : 0;

  const effectiveTotalDue = target
    ? waiveOverdueCharge
      ? target.baseRemaining
      : hasOverdueFee
        ? target.totalRemaining
        : target.baseRemaining + pendingCharge
    : 0;

  useEffect(() => {
    if (!open || !target) return;
    const today = new Date().toISOString().slice(0, 10);
    setPaymentDate(today);
    setAmountMode("full");
    setAmount(String(Math.max(0, effectiveTotalDue)));
    setMethod("CASH");
    setReference("");
    setNotes("");
    setSendEmail(true);
    setSendSms(false);
    setDeliveryContext(null);
    setDeliveryLoading(true);
    setWaiveOverdueCharge(false);
    setErrors({});
    setSiblingInstallments([]);
    void fetchReceiptDeliveryContext(target.studentId)
      .then((ctx) => {
        setDeliveryContext(ctx);
        setSendEmail(ctx.emailConfigured);
        setSendSms(false);
      })
      .catch(() => setDeliveryContext(null))
      .finally(() => setDeliveryLoading(false));
    void fetchStudentInstallments(target.studentId)
      .then((page) => {
        const sameEnrollment = page.items.filter(
          (i) => i.enrollmentId === target.enrollmentId,
        );
        setSiblingInstallments(
          sameEnrollment.length > 0 ? sameEnrollment : page.items,
        );
      })
      .catch(() => setSiblingInstallments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  useEffect(() => {
    if (!open || !target || amountMode !== "full") return;
    setAmount(String(Math.max(0, effectiveTotalDue)));
  }, [open, target, amountMode, waiveOverdueCharge, effectiveTotalDue, paymentDate]);

  if (!target) return null;

  const amountNum = Number(amount);
  const cascadesToLater =
    !isNaN(amountNum) && amountNum > 0 && amountNum > effectiveTotalDue + 0.001;
  const isPartialPayment =
    !isNaN(amountNum) &&
    amountNum > 0 &&
    amountNum < effectiveTotalDue - 0.001;
  const remainingAfterPayment = Math.max(0, effectiveTotalDue - (amountNum || 0));
  const hasPriorPayments = target.paidAmount > 0.001;

  const cascadePreview =
    cascadesToLater && siblingInstallments.length > 0 && !isNaN(amountNum)
      ? planPaymentCascade(
          siblingInstallments.map((i) => {
            const isTarget = i.installmentId === target.installmentId;
            const extraFee =
              isTarget && willBeCharged && !waiveOverdueCharge ? pendingCharge : 0;
            return {
              installmentId: i.installmentId,
              label: i.label,
              order: i.order,
              status: i.status,
              amount: i.amount,
              paidAmount: i.paidAmount,
              overdueCharge: i.overdueCharge + extraFee,
              overdueChargePaid: i.overdueChargePaid,
              overdueChargeWaived: i.overdueChargeWaived,
            };
          }),
          target.installmentId,
          amountNum,
          { waiveFirstOverdue: anyOverdue && waiveOverdueCharge },
        )
      : null;

  const enrollmentTotalRemaining = siblingInstallments.reduce(
    (sum, i) => sum + i.totalRemaining,
    0,
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      next.amount = "Amount must be greater than 0";
    } else if (
      cascadesToLater &&
      cascadePreview &&
      cascadePreview.remaining > 0.01
    ) {
      next.amount = `Amount exceeds total remaining across all instalments (max ${formatMoney(enrollmentTotalRemaining + (willBeCharged && !waiveOverdueCharge ? pendingCharge : 0), "LKR")})`;
    }
    if (!paymentDate) {
      next.paymentDate = "Payment date is required";
    } else if (isNaN(new Date(paymentDate).getTime())) {
      next.paymentDate = "Enter a valid date";
    }
    if (!method) {
      next.method = "Select a payment method";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || !validate()) return;

    setSubmitting(true);
    try {
      const result = await recordPayment({
        studentId: target.studentId,
        installmentId: target.installmentId,
        amount: amountNum,
        paymentDate,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        sendEmail,
        sendSms,
        waiveOverdueCharge: anyOverdue && waiveOverdueCharge,
      });
      const invoices = result.payments.map((p) => ({
        paymentId: p.paymentId,
        invoiceNumber: p.invoiceNumber,
        label: p.installmentLabel,
      }));
      onSuccess({
        message: result.warning
          ? `Payment recorded. ${result.warning}`
          : "Payment recorded successfully",
        paymentId: result.primaryPayment.paymentId,
        invoiceNumber: result.primaryPayment.invoiceNumber,
        invoices,
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
      title="Record payment"
      subtitle={`${target.studentName} · ${target.label}`}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="space-y-2 rounded-xl border border-secondary-300/50 bg-secondary-100/40 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Instalment total</span>
            <span className="font-medium text-primary-900">
              {formatMoney(target.amount, "LKR")}
            </span>
          </div>
          {hasPriorPayments ? (
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Already paid</span>
              <span className="font-medium text-green-800">
                {formatMoney(target.paidAmount, "LKR")}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <span className="text-neutral-600">Remaining (base)</span>
            <span className="font-medium text-primary-900">
              {formatMoney(target.baseRemaining, "LKR")}
            </span>
          </div>

          {hasOverdueFee && !waiveOverdueCharge ? (
            <div className="flex justify-between gap-4">
              <span className="text-neutral-600">Overdue charge</span>
              <span className="font-medium text-red-800">
                {formatMoney(target.feeRemaining, "LKR")}
              </span>
            </div>
          ) : null}

          {willBeCharged && !waiveOverdueCharge ? (
            <div className="flex justify-between gap-4">
              <span className="text-amber-800">Overdue charge (will be applied)</span>
              <span className="font-medium text-amber-900">
                + {formatMoney(pendingCharge, "LKR")}
              </span>
            </div>
          ) : null}

          {anyOverdue && waiveOverdueCharge ? (
            <p className="text-xs text-amber-800">
              Overdue charge will not be applied.
            </p>
          ) : null}

          <div className="flex justify-between gap-4 border-t border-secondary-300/50 pt-2">
            <span className="font-medium text-neutral-700">Total due now</span>
            <span className="font-headline text-lg text-primary-900">
              {formatMoney(effectiveTotalDue, "LKR")}
            </span>
          </div>
        </div>

        {hasPriorPayments ? (
          <p className="text-xs text-neutral-600">
            This instalment has prior payments. You can record another partial
            payment until the total due is cleared.
          </p>
        ) : null}

        {anyOverdue ? (
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={waiveOverdueCharge}
              onChange={(e) => setWaiveOverdueCharge(e.target.checked)}
              className="mt-0.5 size-4 rounded border-amber-400"
            />
            <span>
              {willBeCharged
                ? `Do not apply overdue charge of ${formatMoney(pendingCharge, "LKR")}`
                : "Do not apply overdue charge — student pays instalment amount only"}
            </span>
          </label>
        ) : null}

        {errors.form ? (
          <p className="text-sm text-destructive">{errors.form}</p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
            Payment amount
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAmountMode("full");
                setAmount(String(Math.max(0, effectiveTotalDue)));
              }}
              className={`min-h-10 flex-1 rounded-xl border px-3 text-sm font-medium transition-colors ${
                amountMode === "full"
                  ? "border-primary-900 bg-primary-900 text-tertiary-100"
                  : "border-secondary-400 text-neutral-700"
              }`}
            >
              Pay full remaining
            </button>
            <button
              type="button"
              onClick={() => setAmountMode("custom")}
              className={`min-h-10 flex-1 rounded-xl border px-3 text-sm font-medium transition-colors ${
                amountMode === "custom"
                  ? "border-primary-900 bg-primary-900 text-tertiary-100"
                  : "border-secondary-400 text-neutral-700"
              }`}
            >
              Custom amount
            </button>
          </div>
        </div>

        <UnderlineField
          label="Amount (LKR)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmountMode("custom");
            setAmount(e.target.value);
          }}
          placeholder={
            cascadesToLater
              ? "Can exceed this instalment — surplus applies to later instalments"
              : `Due now ${formatMoney(effectiveTotalDue, "LKR")}`
          }
          error={errors.amount}
        />

        {isPartialPayment ? (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Partial payment — remaining after this:{" "}
            <strong>{formatMoney(remainingAfterPayment, "LKR")}</strong>
          </p>
        ) : null}

        {cascadesToLater ? (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>
              Surplus will apply to later instalments on this enrollment.
            </p>
            {cascadePreview && cascadePreview.applied.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs">
                {cascadePreview.applied.map((slice) => (
                  <li key={slice.installmentId}>
                    {slice.label}: {formatMoney(slice.amount, "LKR")}
                  </li>
                ))}
              </ul>
            ) : null}
            {cascadePreview && cascadePreview.remaining > 0.01 ? (
              <p className="mt-1 text-xs font-medium text-red-800">
                {formatMoney(cascadePreview.remaining, "LKR")} exceeds total
                remaining on this enrollment.
              </p>
            ) : null}
          </div>
        ) : null}

        <UnderlineField
          label="Payment date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          error={errors.paymentDate}
        />
        <p className="-mt-2 text-xs text-neutral-600">
          Overdue fees use this date (not today). Use a past date when recording a
          late payment that was received earlier.
        </p>

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
          placeholder="Bank ref or receipt no."
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
