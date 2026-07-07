"use client";

import { FormEvent, useEffect, useState } from "react";

import { CurrencyInput } from "@/components/settings/currency-input";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { Plus, Trash2 } from "@/lib/icons";
import {
  computeDiscountFromUpfront,
  computeOneTimePrice,
} from "@/lib/payments/payment-plan-utils";
import type {
  PaymentPlanDto,
  PaymentPlanLineItemInput,
} from "@/types/api/settings";

type PaymentPlanModalProps = {
  open: boolean;
  onClose: () => void;
  currency: string;
  plan?: PaymentPlanDto | null;
  onSubmit: (data: {
    name: string;
    registrationFee: number;
    courseFee: number;
    oneTimeDiscountAmount: number;
    isActive: boolean;
    lineItems: PaymentPlanLineItemInput[];
  }) => Promise<void>;
};

function emptyLineItem(order: number): PaymentPlanLineItemInput {
  return { label: "", amount: 0, order };
}

export function PaymentPlanModal({
  open,
  onClose,
  currency,
  plan,
  onSubmit,
}: PaymentPlanModalProps) {
  const [name, setName] = useState("");
  const [registrationFee, setRegistrationFee] = useState("1000");
  const [courseFee, setCourseFee] = useState("50000");
  const [discountAmount, setDiscountAmount] = useState("5000");
  const [upfrontPrice, setUpfrontPrice] = useState("45000");
  const [isActive, setIsActive] = useState(true);
  const [lineItems, setLineItems] = useState<PaymentPlanLineItemInput[]>([
    emptyLineItem(0),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setRegistrationFee(String(plan?.registrationFee ?? 1000));
    setCourseFee(String(plan?.courseFee ?? 50000));
    setDiscountAmount(String(plan?.oneTimeDiscountAmount ?? 5000));
    setUpfrontPrice(String(plan?.oneTimePrice ?? 45000));
    setIsActive(plan?.isActive ?? true);
    setLineItems(
      plan?.lineItems.length
        ? plan.lineItems.map((item) => ({
            id: item.id,
            label: item.label,
            amount: item.amount,
            order: item.order,
          }))
        : [emptyLineItem(0)],
    );
    setError(null);
  }, [open, plan]);

  function syncUpfrontFromDiscount(fee: number, discount: number) {
    setUpfrontPrice(String(computeOneTimePrice(fee, discount)));
  }

  function syncDiscountFromUpfront(fee: number, upfront: number) {
    setDiscountAmount(String(computeDiscountFromUpfront(fee, upfront)));
  }

  function handleCourseFeeChange(value: string) {
    setCourseFee(value);
    const fee = parseFloat(value) || 0;
    const discount = parseFloat(discountAmount) || 0;
    syncUpfrontFromDiscount(fee, discount);
  }

  function handleDiscountChange(value: string) {
    setDiscountAmount(value);
    const fee = parseFloat(courseFee) || 0;
    syncUpfrontFromDiscount(fee, parseFloat(value) || 0);
  }

  function handleUpfrontChange(value: string) {
    setUpfrontPrice(value);
    const fee = parseFloat(courseFee) || 0;
    syncDiscountFromUpfront(fee, parseFloat(value) || 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const fee = parseFloat(courseFee) || 0;
      const discount = parseFloat(discountAmount) || 0;
      const reg = parseFloat(registrationFee) || 0;

      if (!name.trim()) {
        throw new Error("Plan name is required");
      }
      if (discount > fee) {
        throw new Error("Discount cannot exceed course fee");
      }

      const items = lineItems
        .filter((item) => item.label.trim())
        .map((item, index) => ({
          ...item,
          label: item.label.trim(),
          amount: item.amount,
          order: index,
        }));

      if (items.length === 0) {
        throw new Error("Add at least one installment line item");
      }

      await onSubmit({
        name: name.trim(),
        registrationFee: reg,
        courseFee: fee,
        oneTimeDiscountAmount: discount,
        isActive,
        lineItems: items,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2 text-sm outline-none focus:border-primary-900";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={plan ? "Edit payment plan" : "Add payment plan"}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Plan name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Extended plan"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <CurrencyInput
            id="plan-registration-fee"
            label="Registration fee"
            value={registrationFee}
            onChange={setRegistrationFee}
            currency={currency}
          />
          <CurrencyInput
            id="plan-course-fee"
            label="Course fee"
            value={courseFee}
            onChange={handleCourseFeeChange}
            currency={currency}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CurrencyInput
            id="plan-discount"
            label="One-time discount"
            value={discountAmount}
            onChange={handleDiscountChange}
            currency={currency}
          />
          <CurrencyInput
            id="plan-upfront"
            label="One-time upfront price"
            value={upfrontPrice}
            onChange={handleUpfrontChange}
            currency={currency}
          />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-secondary-400"
          />
          <span className="text-sm text-neutral-700">Active</span>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Installment line items
            </span>
            <button
              type="button"
              onClick={() =>
                setLineItems((prev) => [...prev, emptyLineItem(prev.length)])
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-900 hover:underline"
            >
              <Plus className="size-3.5" />
              Add line
            </button>
          </div>
          <ul className="space-y-2">
            {lineItems.map((item, index) => (
              <li
                key={item.id ?? `line-${index}`}
                className="flex flex-col gap-2 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-3 sm:flex-row sm:items-end"
              >
                <label className="min-w-0 flex-1 space-y-1">
                  <span className="text-xs text-neutral-600">Label</span>
                  <input
                    value={item.label}
                    onChange={(e) =>
                      setLineItems((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, label: e.target.value } : row,
                        ),
                      )
                    }
                    className={inputClass}
                    placeholder="First Month (1st Week)"
                  />
                </label>
                <label className="w-full space-y-1 sm:w-32">
                  <span className="text-xs text-neutral-600">Amount</span>
                  <input
                    type="number"
                    min={0}
                    value={item.amount || ""}
                    onChange={(e) =>
                      setLineItems((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? { ...row, amount: parseFloat(e.target.value) || 0 }
                            : row,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setLineItems((prev) =>
                      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
                    )
                  }
                  className="rounded-lg p-2 text-neutral-600 hover:bg-secondary-200 hover:text-destructive"
                  aria-label="Remove line item"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <SubmitButton
          loading={isSubmitting}
          loadingText="Saving…"
          className="w-full"
        >
          {plan ? "Save plan" : "Create plan"}
        </SubmitButton>
      </form>
    </Modal>
  );
}
