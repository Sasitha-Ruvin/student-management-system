"use client";

import { FormEvent, useEffect, useState } from "react";

import { CurrencyInput } from "@/components/settings/currency-input";
import { PaymentPlanModal } from "@/components/settings/payment-plan-modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { Spinner } from "@/components/ui/spinner";
import { Pencil, Plus, Trash2 } from "@/lib/icons";
import {
  computeDiscountFromUpfront,
  computeInstallmentSubtotal,
  computeOneTimePrice,
} from "@/lib/payments/payment-plan-utils";
import type {
  AcademySettingsDto,
  PaymentPlanDto,
  PaymentPlanLineItemInput,
  UpdatePaymentPlanBody,
} from "@/types/api/settings";

type PaymentStructureTabProps = {
  settings: AcademySettingsDto;
  onSaveSettings: (
    data: Pick<
      AcademySettingsDto,
      "overdueChargeEnabled" | "overdueChargeAmount"
    >,
  ) => Promise<void>;
  paymentPlans: PaymentPlanDto[];
  onSaveDefaultPlan: (
    id: string,
    body: UpdatePaymentPlanBody,
  ) => Promise<PaymentPlanDto>;
  onAddPlan: (data: {
    name: string;
    registrationFee: number;
    courseFee: number;
    oneTimeDiscountAmount: number;
    isActive: boolean;
    lineItems: PaymentPlanLineItemInput[];
  }) => Promise<void>;
  onEditPlan: (
    id: string,
    data: {
      name: string;
      registrationFee: number;
      courseFee: number;
      oneTimeDiscountAmount: number;
      isActive: boolean;
      lineItems: PaymentPlanLineItemInput[];
    },
  ) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
  onTogglePlanActive: (id: string, isActive: boolean) => Promise<void>;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PaymentStructureTab({
  settings,
  onSaveSettings,
  paymentPlans,
  onSaveDefaultPlan,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onTogglePlanActive,
}: PaymentStructureTabProps) {
  const defaultPlan =
    paymentPlans.find((p) => p.isDefault) ?? paymentPlans[0] ?? null;
  const alternatePlans = paymentPlans.filter((p) => !p.isDefault);

  const [courseFee, setCourseFee] = useState(
    String(defaultPlan?.courseFee ?? settings.defaultCourseFee),
  );
  const [registrationFee, setRegistrationFee] = useState(
    String(defaultPlan?.registrationFee ?? settings.defaultRegistrationFee),
  );
  const [discountAmount, setDiscountAmount] = useState(
    String(defaultPlan?.oneTimeDiscountAmount ?? 0),
  );
  const [upfrontPrice, setUpfrontPrice] = useState(
    String(defaultPlan?.oneTimePrice ?? 0),
  );
  const [lineItems, setLineItems] = useState<PaymentPlanLineItemInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlanDto | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"toggle" | "delete" | null>(null);
  const [overdueEnabled, setOverdueEnabled] = useState(settings.overdueChargeEnabled);
  const [overdueAmount, setOverdueAmount] = useState(
    String(settings.overdueChargeAmount),
  );
  const [savingOverdue, setSavingOverdue] = useState(false);
  const [overdueMessage, setOverdueMessage] = useState<string | null>(null);

  useEffect(() => {
    setOverdueEnabled(settings.overdueChargeEnabled);
    setOverdueAmount(String(settings.overdueChargeAmount));
  }, [settings.overdueChargeEnabled, settings.overdueChargeAmount]);

  async function handleTogglePlan(id: string, isActive: boolean) {
    setBusyPlanId(id);
    setBusyAction("toggle");
    try {
      await onTogglePlanActive(id, isActive);
    } finally {
      setBusyPlanId(null);
      setBusyAction(null);
    }
  }

  async function handleDeletePlan(id: string) {
    setBusyPlanId(id);
    setBusyAction("delete");
    try {
      await onDeletePlan(id);
    } finally {
      setBusyPlanId(null);
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (!defaultPlan) return;
    setCourseFee(String(defaultPlan.courseFee));
    setRegistrationFee(String(defaultPlan.registrationFee));
    setDiscountAmount(String(defaultPlan.oneTimeDiscountAmount));
    setUpfrontPrice(String(defaultPlan.oneTimePrice));
    setLineItems(
      defaultPlan.lineItems.map((item) => ({
        id: item.id,
        label: item.label,
        amount: item.amount,
        order: item.order,
      })),
    );
  }, [defaultPlan]);

  if (!defaultPlan) {
    return (
      <p className="text-sm text-neutral-600">
        No default payment plan found. Run database seed or create a plan.
      </p>
    );
  }

  const installmentSubtotal = computeInstallmentSubtotal(lineItems);
  const reg = parseFloat(registrationFee) || 0;
  const fee = parseFloat(courseFee) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const upfront = parseFloat(upfrontPrice) || 0;
  const totalInstallmentPath = reg + installmentSubtotal;

  function handleCourseFeeChange(value: string) {
    setCourseFee(value);
    const nextFee = parseFloat(value) || 0;
    setUpfrontPrice(String(computeOneTimePrice(nextFee, discount)));
  }

  function handleDiscountChange(value: string) {
    setDiscountAmount(value);
    const nextDiscount = parseFloat(value) || 0;
    setUpfrontPrice(String(computeOneTimePrice(fee, nextDiscount)));
  }

  function handleUpfrontChange(value: string) {
    setUpfrontPrice(value);
    const nextUpfront = parseFloat(value) || 0;
    setDiscountAmount(String(computeDiscountFromUpfront(fee, nextUpfront)));
  }

  async function handleSaveDefault(e: FormEvent) {
    e.preventDefault();
    if (!defaultPlan) return;

    setIsSaving(true);
    setMessage(null);
    try {
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

      if (discount > fee) {
        throw new Error("Discount cannot exceed course fee");
      }

      await onSaveDefaultPlan(defaultPlan.id, {
        registrationFee: reg,
        courseFee: fee,
        oneTimeDiscountAmount: discount,
        lineItems: items,
      });
      setMessage("Payment structure saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveOverdue(e: FormEvent) {
    e.preventDefault();
    setSavingOverdue(true);
    setOverdueMessage(null);
    try {
      await onSaveSettings({
        overdueChargeEnabled: overdueEnabled,
        overdueChargeAmount: parseFloat(overdueAmount) || 0,
      });
      setOverdueMessage("Late payment settings saved.");
    } catch (err) {
      setOverdueMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingOverdue(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => void handleSaveOverdue(e)}
        className="space-y-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5"
      >
        <h3 className="font-headline text-lg text-primary-900">Late payment fee</h3>
        <p className="text-sm text-neutral-600">
          When enabled, a one-time overdue charge is added the day after an
          instalment due date. Instalments that were already overdue before you
          enable this are not charged retroactively.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary-900">
          <input
            type="checkbox"
            checked={overdueEnabled}
            onChange={(e) => setOverdueEnabled(e.target.checked)}
            className="size-4 rounded border-secondary-400"
          />
          Charge overdue fee on late instalments
        </label>
        <CurrencyInput
          id="overdue-charge-amount"
          label="Overdue charge amount"
          currency={settings.currency}
          value={overdueAmount}
          onChange={setOverdueAmount}
        />
        {overdueMessage ? (
          <p className="text-sm text-neutral-700">{overdueMessage}</p>
        ) : null}
        <SubmitButton type="submit" loading={savingOverdue} loadingText="Saving…">
          Save late payment settings
        </SubmitButton>
      </form>

      <form onSubmit={handleSaveDefault} className="space-y-6">
        <div className="rounded-2xl bg-primary-900 px-6 py-5 text-tertiary-100">
          <p className="text-xs tracking-wide text-secondary-300 uppercase">
            Total course fee
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm text-secondary-300">
              {settings.currency}
            </span>
            <input
              type="number"
              min={0}
              value={courseFee}
              onChange={(e) => handleCourseFeeChange(e.target.value)}
              className="w-full max-w-xs bg-transparent font-headline text-4xl text-tertiary-100 outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl bg-neutral-800 p-5 text-tertiary-100">
            <h3 className="mb-4 font-headline text-lg">Installment plan</h3>
            <div className="mb-4 rounded-xl bg-neutral-700/60 px-4 py-3">
              <p className="text-xs text-neutral-300">Registration fee</p>
              <input
                type="number"
                min={0}
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                className="mt-1 w-full bg-transparent font-headline text-2xl outline-none"
              />
            </div>
            <ul className="space-y-2">
              {lineItems.map((item, index) => (
                <li
                  key={item.id ?? `default-line-${index}`}
                  className="flex flex-col gap-2 rounded-xl bg-neutral-700/40 p-3 sm:flex-row sm:items-end"
                >
                  <label className="min-w-0 flex-1 space-y-1">
                    <span className="text-xs text-neutral-400">Label</span>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, label: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-secondary-300"
                    />
                  </label>
                  <label className="w-full space-y-1 sm:w-28">
                    <span className="text-xs text-neutral-400">Amount</span>
                    <input
                      type="number"
                      min={0}
                      value={item.amount || ""}
                      onChange={(e) =>
                        setLineItems((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  amount: parseFloat(e.target.value) || 0,
                                }
                              : row,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-secondary-300"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems((prev) =>
                        prev.length > 1
                          ? prev.filter((_, i) => i !== index)
                          : prev,
                      )
                    }
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-600 hover:text-tertiary-100"
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                setLineItems((prev) => [
                  ...prev,
                  { label: "", amount: 0, order: prev.length },
                ])
              }
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-secondary-300 hover:text-tertiary-100"
            >
              <Plus className="size-3.5" />
              Add installment
            </button>
            <p className="mt-4 text-xs text-neutral-400">
              Installment path total (reg + installments):{" "}
              {formatMoney(totalInstallmentPath, settings.currency)}
            </p>
          </section>

          <section className="relative rounded-2xl border border-secondary-300/60 bg-tertiary-100 p-5 shadow-sm">
            <span className="absolute top-4 right-4 rounded-full bg-primary-900 px-2.5 py-1 text-xs font-medium text-tertiary-100">
              Save {formatMoney(discount, settings.currency)}
            </span>
            <h3 className="font-headline text-lg text-primary-900">
              One-time payment
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Pay upfront and save!
            </p>
            <p className="mt-4 text-sm text-neutral-500 line-through">
              {formatMoney(fee, settings.currency)}
            </p>
            <p className="font-headline text-4xl text-primary-900">
              {formatMoney(upfront, settings.currency)}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CurrencyInput
                id="default-discount"
                label="Discount amount"
                value={discountAmount}
                onChange={handleDiscountChange}
                currency={settings.currency}
              />
              <CurrencyInput
                id="default-upfront"
                label="Upfront price"
                value={upfrontPrice}
                onChange={handleUpfrontChange}
                currency={settings.currency}
              />
            </div>
            <p className="mt-4 text-xs text-neutral-600">
              Registration fee ({formatMoney(reg, settings.currency)}) is still
              charged separately for one-time payments.
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Flexible payment methods to suit your convenience
            </p>
          </section>
        </div>

        {message ? (
          <p
            className={
              message.includes("Failed")
                ? "text-sm text-destructive"
                : "text-sm text-neutral-700"
            }
          >
            {message}
          </p>
        ) : null}

        <SubmitButton loading={isSaving} loadingText="Saving…">
          Save payment structure
        </SubmitButton>
      </form>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-lg text-primary-900">
            Alternate payment plans
          </h3>
          <button
            type="button"
            onClick={() => {
              setEditingPlan(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2 text-sm font-medium text-primary-900 hover:bg-secondary-200"
          >
            <Plus className="size-4" />
            Add plan
          </button>
        </div>

        <ul className="space-y-2">
          {alternatePlans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center gap-3 rounded-xl border border-secondary-300/60 bg-secondary-100/30 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={plan.isActive}
                disabled={busyPlanId === plan.id}
                onChange={(e) =>
                  void handleTogglePlan(plan.id, e.target.checked)
                }
                className="size-4 rounded border-secondary-400 disabled:opacity-50"
                aria-label={`Toggle ${plan.name}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-primary-900">{plan.name}</p>
                <p className="text-xs text-neutral-600">
                  {formatMoney(plan.courseFee, settings.currency)} course ·{" "}
                  {plan.lineItems.length} installments · upfront{" "}
                  {formatMoney(plan.oneTimePrice, settings.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(plan);
                  setModalOpen(true);
                }}
                className="rounded-lg p-1.5 hover:bg-secondary-200"
                aria-label="Edit plan"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                disabled={busyPlanId === plan.id}
                onClick={() => void handleDeletePlan(plan.id)}
                className="rounded-lg p-1.5 text-destructive hover:bg-secondary-200 disabled:opacity-50"
                aria-label="Delete plan"
              >
                {busyPlanId === plan.id && busyAction === "delete" ? (
                  <Spinner className="size-4" label="Deleting plan" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
          {alternatePlans.length === 0 ? (
            <p className="text-sm text-neutral-600">
              No alternate plans yet. The default structure above applies to new
              batches unless another plan is selected.
            </p>
          ) : null}
        </ul>
      </div>

      <PaymentPlanModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
        currency={settings.currency}
        plan={editingPlan}
        onSubmit={async (data) => {
          if (editingPlan) {
            await onEditPlan(editingPlan.id, data);
          } else {
            await onAddPlan(data);
          }
        }}
      />
    </div>
  );
}
