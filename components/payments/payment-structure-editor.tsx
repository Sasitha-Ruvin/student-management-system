"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchBatchDetail } from "@/lib/api/batches";
import { fetchSettings } from "@/lib/api/settings";
import { formatMoney } from "@/lib/format/money";
import { Plus, Trash2 } from "@/lib/icons";
import { computeOneTimePrice } from "@/lib/payments/payment-plan-utils";
import type { BatchDetail } from "@/types/api/batch";
import {
  emptyCustomInstallment,
  type PaymentStructureValue,
} from "@/types/api/payment-enrollment";
import type { PaymentPlanDto } from "@/types/api/settings";
import type {
  CustomInstallmentInput,
  EnrollmentInstallmentSource,
  EnrollmentPaymentPath,
} from "@/types/api/student";

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-base outline-none focus:border-primary-900 sm:text-sm";

type PaymentStructureEditorProps = {
  batchId: string | null;
  value: PaymentStructureValue;
  onChange: (value: PaymentStructureValue) => void;
  fieldErrors?: { customCourseFee?: string };
  feeTouched?: boolean;
  onFeeTouched?: (touched: boolean) => void;
};

function SegmentedOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
        selected
          ? "border-primary-900 bg-primary-900 text-tertiary-100"
          : "border-secondary-400 bg-tertiary-100 text-primary-900 hover:bg-secondary-100/50"
      }`}
    >
      {children}
    </button>
  );
}

export function PaymentStructureEditor({
  batchId,
  value,
  onChange,
  fieldErrors,
  feeTouched = false,
  onFeeTouched,
}: PaymentStructureEditorProps) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanDto[]>([]);
  const [currency, setCurrency] = useState("LKR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!batchId) {
      setBatch(null);
      return;
    }
    setLoading(true);
    void Promise.all([fetchBatchDetail(batchId), fetchSettings()])
      .then(([detail, settings]) => {
        setBatch(detail);
        setPaymentPlans(settings.paymentPlans.filter((p) => p.isActive));
        setCurrency(settings.settings.currency);
      })
      .catch(() => setBatch(null))
      .finally(() => setLoading(false));
  }, [batchId]);

  const pricing = useMemo(() => {
    if (!batch) return null;
    const courseFee = Number(batch.courseFee);
    const oneTimeDiscountAmount = Number(batch.oneTimeDiscountAmount ?? 0);
    const oneTimePrice = Number(
      batch.oneTimePrice ?? computeOneTimePrice(courseFee, oneTimeDiscountAmount),
    );
    return { courseFee, oneTimeDiscountAmount, oneTimePrice, registrationFee: Number(batch.registrationFee) };
  }, [batch]);

  const selectedPlan = useMemo(
    () => paymentPlans.find((p) => p.id === value.paymentPlanId) ?? null,
    [paymentPlans, value.paymentPlanId],
  );

  const customTotal = useMemo(
    () => value.customInstallments.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [value.customInstallments],
  );

  const feeMismatch =
    value.installmentSource === "CUSTOM" &&
    pricing &&
    value.customCourseFee !== "" &&
    Math.abs(customTotal - Number(value.customCourseFee)) > 0.01;

  useEffect(() => {
    if (!batch || !pricing || feeTouched) return;
    if (value.paymentPath === "ONE_TIME") {
      const next = String(pricing.oneTimePrice);
      if (value.customCourseFee !== next) {
        onChange({ ...value, customCourseFee: next });
      }
      return;
    }
    if (value.installmentSource === "CUSTOM") {
      const next = String(customTotal || pricing.courseFee);
      if (value.customCourseFee !== next) {
        onChange({ ...value, customCourseFee: next });
      }
      return;
    }
    if (value.installmentSource === "NAMED_PLAN" && selectedPlan) {
      const next = String(selectedPlan.courseFee);
      if (value.customCourseFee !== next) {
        onChange({ ...value, customCourseFee: next });
      }
      return;
    }
    if (value.installmentSource === "BATCH") {
      const next = String(pricing.courseFee);
      if (value.customCourseFee !== next) {
        onChange({ ...value, customCourseFee: next });
      }
    }
  }, [
    batch,
    pricing,
    value.paymentPath,
    value.installmentSource,
    value.paymentPlanId,
    selectedPlan,
    customTotal,
    feeTouched,
  ]);

  function patch(partial: Partial<PaymentStructureValue>) {
    onChange({ ...value, ...partial });
  }

  function setPaymentPath(path: EnrollmentPaymentPath) {
    if (!pricing) {
      patch({ paymentPath: path });
      return;
    }
    onFeeTouched?.(false);
    patch({
      paymentPath: path,
      customCourseFee:
        path === "ONE_TIME"
          ? String(pricing.oneTimePrice)
          : value.installmentSource === "NAMED_PLAN" && selectedPlan
            ? String(selectedPlan.courseFee)
            : value.installmentSource === "CUSTOM"
              ? String(customTotal || pricing.courseFee)
              : String(pricing.courseFee),
    });
  }

  function setInstallmentSource(source: EnrollmentInstallmentSource) {
    if (!batch || !pricing) {
      patch({ installmentSource: source, paymentPlanId: null });
      return;
    }
    onFeeTouched?.(false);

    if (source === "BATCH") {
      patch({
        installmentSource: source,
        paymentPlanId: null,
        customCourseFee: String(pricing.courseFee),
      });
      return;
    }

    if (source === "NAMED_PLAN") {
      const planId = batch.paymentPlanId ?? paymentPlans[0]?.id ?? null;
      const plan = paymentPlans.find((p) => p.id === planId);
      patch({
        installmentSource: source,
        paymentPlanId: planId,
        customCourseFee: plan ? String(plan.courseFee) : String(pricing.courseFee),
      });
      return;
    }

    const dueBase = batch.startDate.slice(0, 10);
    const lines: CustomInstallmentInput[] =
      batch.installmentTemplates.length > 0
        ? batch.installmentTemplates.map((t, idx) => ({
            label: t.label,
            amount: t.amount,
            dueDate: t.dueDate.slice(0, 10),
            order: idx,
          }))
        : [emptyCustomInstallment(0, dueBase)];

    const total = lines.reduce((s, l) => s + l.amount, 0);
    patch({
      installmentSource: source,
      paymentPlanId: null,
      customInstallments: lines,
      customCourseFee: String(total || pricing.courseFee),
    });
  }

  function selectNamedPlan(planId: string) {
    const plan = paymentPlans.find((p) => p.id === planId);
    if (!plan) return;
    onFeeTouched?.(false);
    patch({
      installmentSource: "NAMED_PLAN",
      paymentPlanId: planId,
      customCourseFee: String(plan.courseFee),
    });
  }

  if (!batchId) {
    return (
      <p className="text-sm text-neutral-600">Select a batch to configure payment.</p>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading batch payment details…</p>;
  }

  if (!batch || !pricing) {
    return <p className="text-sm text-destructive">Could not load batch payment details.</p>;
  }

  const isOneTime = value.paymentPath === "ONE_TIME";
  const batchPlanLabel =
    batch.paymentPlanName ??
    (batch.paymentPlanId ? "Linked plan" : "Custom batch structure");

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-neutral-600 uppercase">
          Payment path
        </p>
        <div className="flex gap-2">
          <SegmentedOption
            selected={value.paymentPath === "INSTALLMENT"}
            onClick={() => setPaymentPath("INSTALLMENT")}
          >
            Instalment plan
          </SegmentedOption>
          <SegmentedOption
            selected={value.paymentPath === "ONE_TIME"}
            onClick={() => setPaymentPath("ONE_TIME")}
          >
            One-time payment
          </SegmentedOption>
        </div>
      </div>

      {isOneTime && pricing.oneTimeDiscountAmount > 0 ? (
        <div className="rounded-xl border border-primary-900/20 bg-primary-900/5 px-4 py-3 text-sm">
          <p className="font-medium text-primary-900">
            Pay upfront and save {formatMoney(pricing.oneTimeDiscountAmount, currency)}
          </p>
          <p className="mt-1 text-neutral-600">
            <span className="line-through">
              {formatMoney(pricing.courseFee, currency)}
            </span>{" "}
            <span className="font-semibold text-primary-900">
              {formatMoney(pricing.oneTimePrice, currency)}
            </span>{" "}
            course fee
          </p>
        </div>
      ) : null}

      {!isOneTime ? (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Instalment structure
          </p>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <SegmentedOption
              selected={value.installmentSource === "BATCH"}
              onClick={() => setInstallmentSource("BATCH")}
            >
              Use batch plan
            </SegmentedOption>
            <SegmentedOption
              selected={value.installmentSource === "NAMED_PLAN"}
              onClick={() => setInstallmentSource("NAMED_PLAN")}
            >
              Choose another plan
            </SegmentedOption>
            <SegmentedOption
              selected={value.installmentSource === "CUSTOM"}
              onClick={() => setInstallmentSource("CUSTOM")}
            >
              Custom instalments
            </SegmentedOption>
          </div>

          {value.installmentSource === "BATCH" ? (
            <div className="rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-4 text-sm">
              <p className="font-medium text-primary-900">{batch.name}</p>
              <p className="mt-1 text-neutral-600">
                Plan: <span className="text-primary-900">{batchPlanLabel}</span>
              </p>
              <p className="mt-1 text-neutral-600">
                Course fee: {formatMoney(pricing.courseFee, currency)}
              </p>
              {batch.installmentTemplates.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-secondary-300/50 pt-3">
                  {batch.installmentTemplates.map((t) => (
                    <li
                      key={t.id}
                      className="flex justify-between gap-2 text-neutral-700"
                    >
                      <span>{t.label}</span>
                      <span>
                        {formatMoney(t.amount, currency)} ·{" "}
                        {t.dueDate.slice(0, 10)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-amber-800">
                  This batch has no instalment lines — choose another plan or use custom
                  instalments.
                </p>
              )}
            </div>
          ) : null}

          {value.installmentSource === "NAMED_PLAN" ? (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">
                Plans are managed in Settings → Payment structure.
              </p>
              <div className="flex flex-wrap gap-2">
                {paymentPlans.map((plan) => {
                  const selected = value.paymentPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectNamedPlan(plan.id)}
                      className={`min-w-[140px] rounded-xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? "border-primary-900 bg-primary-900/5 ring-1 ring-primary-900"
                          : "border-secondary-400 bg-tertiary-100 hover:bg-secondary-100/50"
                      }`}
                    >
                      <span className="font-medium text-primary-900">{plan.name}</span>
                      {plan.isDefault ? (
                        <span className="ml-2 rounded-full bg-primary-900/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary-900">
                          Default
                        </span>
                      ) : null}
                      <p className="mt-1 text-xs text-neutral-600">
                        {formatMoney(plan.courseFee, currency)} · {plan.lineItems.length}{" "}
                        instalments
                      </p>
                    </button>
                  );
                })}
              </div>
              {selectedPlan && selectedPlan.lineItems.length > 0 ? (
                <ul className="space-y-1 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-3 text-sm">
                  {selectedPlan.lineItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-2 text-neutral-700"
                    >
                      <span>{item.label}</span>
                      <span>{formatMoney(item.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {value.installmentSource === "CUSTOM" ? (
            <div className="space-y-3">
              {feeMismatch ? (
                <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Instalment total ({formatMoney(customTotal, currency)}) does not match
                  course fee ({formatMoney(Number(value.customCourseFee), currency)}).
                </p>
              ) : null}
              <ul className="space-y-3">
                {value.customInstallments.map((line, idx) => (
                  <li
                    key={idx}
                    className="grid gap-2 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
                  >
                    <input
                      value={line.label}
                      onChange={(e) => {
                        const next = [...value.customInstallments];
                        next[idx] = { ...line, label: e.target.value };
                        const total = next.reduce((s, l) => s + (Number(l.amount) || 0), 0);
                        onFeeTouched?.(false);
                        patch({
                          customInstallments: next,
                          customCourseFee: String(total),
                        });
                      }}
                      className={inputClass}
                      placeholder="Label"
                    />
                    <input
                      type="number"
                      min={0}
                      value={line.amount || ""}
                      onChange={(e) => {
                        const next = [...value.customInstallments];
                        next[idx] = { ...line, amount: Number(e.target.value) };
                        const total = next.reduce((s, l) => s + (Number(l.amount) || 0), 0);
                        onFeeTouched?.(false);
                        patch({
                          customInstallments: next,
                          customCourseFee: String(total),
                        });
                      }}
                      className={inputClass}
                      placeholder="Amount"
                    />
                    <input
                      type="date"
                      required
                      value={line.dueDate}
                      onChange={(e) => {
                        const next = [...value.customInstallments];
                        next[idx] = { ...line, dueDate: e.target.value };
                        patch({ customInstallments: next });
                      }}
                      className={inputClass}
                      aria-label={`Due date for ${line.label}`}
                    />
                    <button
                      type="button"
                      disabled={value.customInstallments.length <= 1}
                      onClick={() => {
                        const next = value.customInstallments.filter((_, i) => i !== idx);
                        const total = next.reduce((s, l) => s + (Number(l.amount) || 0), 0);
                        onFeeTouched?.(false);
                        patch({
                          customInstallments: next,
                          customCourseFee: String(total),
                        });
                      }}
                      className="flex size-11 items-center justify-center rounded-xl border border-secondary-400 text-destructive disabled:opacity-40"
                      aria-label="Remove instalment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  const order = value.customInstallments.length;
                  const dueBase = batch.startDate.slice(0, 10);
                  patch({
                    customInstallments: [
                      ...value.customInstallments,
                      emptyCustomInstallment(order, dueBase),
                    ],
                  });
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-secondary-400 px-3 text-sm font-medium text-primary-900"
              >
                <Plus className="size-4" />
                Add instalment
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
          {isOneTime ? "Upfront course payment" : "Course fee"} ({currency})
        </span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value.customCourseFee}
          onChange={(e) => {
            onFeeTouched?.(true);
            patch({ customCourseFee: e.target.value });
          }}
          className={inputClass}
        />
        {fieldErrors?.customCourseFee ? (
          <p className="text-sm text-destructive">{fieldErrors.customCourseFee}</p>
        ) : (
          <p className="text-xs text-neutral-500">
            Batch default:{" "}
            {formatMoney(
              isOneTime ? pricing.oneTimePrice : pricing.courseFee,
              currency,
            )}
          </p>
        )}
      </label>
    </div>
  );
}
