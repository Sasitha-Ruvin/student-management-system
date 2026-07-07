"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CreateBatchSessionEditor,
  previewToEditableRows,
  type EditableSessionRow,
} from "@/components/batches/create-batch-session-editor";
import { fetchBatchCodePreview, fetchSessionPreview } from "@/lib/api/batches";
import { fetchSettings } from "@/lib/api/settings";
import { formatMoney } from "@/lib/format/money";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Plus, Trash2 } from "@/lib/icons";
import type {
  CreateBatchBody,
  InstallmentInput,
} from "@/types/api/batch";
import type { PaymentPlanDto } from "@/types/api/settings";

type CreateBatchModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: CreateBatchBody) => Promise<{ detail: { id: string; batchCode: string } }>;
  onViewBatch: (id: string) => void;
};

type WizardStep = 1 | 2 | 3 | "success";

function emptyInstallment(order: number): InstallmentInput {
  return { label: `Installment ${order}`, amount: 0, dueDate: "", order };
}

function validateInstallmentStep(installments: InstallmentInput[]): string | null {
  if (installments.length === 0) {
    return "Add at least one installment";
  }
  const missingDueDate = installments.some((inst) => !inst.dueDate.trim());
  if (missingDueDate) {
    return "Due dates are required for all installments";
  }
  return null;
}

export function CreateBatchModal({
  open,
  onClose,
  onSubmit,
  onViewBatch,
}: CreateBatchModalProps) {
  const { branches, isLoading: branchesLoading } = useBranchesPicker();
  const [step, setStep] = useState<WizardStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<{ id: string; batchCode: string } | null>(null);

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [defaultClassTime, setDefaultClassTime] = useState("09:00");
  const [defaultClassEndTime, setDefaultClassEndTime] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [courseFee, setCourseFee] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [codePreview, setCodePreview] = useState("");
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanDto[]>([]);
  const [currency, setCurrency] = useState("LKR");

  const [installments, setInstallments] = useState<InstallmentInput[]>([
    emptyInstallment(0),
  ]);
  const [sessionDates, setSessionDates] = useState<EditableSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionListError, setSessionListError] = useState<string | null>(null);

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.branchCode})`,
  }));

  const branchPlaceholder = branchesLoading
    ? "Loading branches…"
    : branchOptions.length === 0
      ? "No active branches"
      : "Select…";

  const installmentTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [installments],
  );
  const courseFeeNum = Number(courseFee) || 0;
  const feeMismatch =
    courseFeeNum > 0 && Math.abs(installmentTotal - courseFeeNum) > 0.01;

  const reset = useCallback(() => {
    setStep(1);
    setError(null);
    setName("");
    setBranchId("");
    setStartDate("");
    setEndDate("");
    setDefaultClassTime("09:00");
    setDefaultClassEndTime("");
    setRegistrationFee("");
    setCourseFee("");
    setMaxCapacity("");
    setPaymentPlanId("");
    setCodePreview("");
    setInstallments([emptyInstallment(0)]);
    setSessionDates([]);
    setSessionListError(null);
    setCreatedBatch(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    void fetchSettings().then((data) => {
      setCurrency(data.settings.currency);
      setRegistrationFee(String(data.settings.defaultRegistrationFee));
      setCourseFee(String(data.settings.defaultCourseFee));
      setPaymentPlans(data.paymentPlans.filter((p) => p.isActive));
      const defaultPlan = data.paymentPlans.find((p) => p.isDefault);
      if (defaultPlan) {
        setPaymentPlanId(defaultPlan.id);
        setRegistrationFee(String(defaultPlan.registrationFee));
        setCourseFee(String(defaultPlan.courseFee));
        setInstallments(
          defaultPlan.lineItems.map((item, idx) => ({
            label: item.label,
            amount: item.amount,
            dueDate: "",
            order: idx,
          })),
        );
      }
    });
  }, [open, reset]);

  useEffect(() => {
    if (!branchId || !startDate) {
      setCodePreview("");
      return;
    }
    const t = setTimeout(() => {
      void fetchBatchCodePreview(branchId, startDate)
        .then(setCodePreview)
        .catch(() => setCodePreview(""));
    }, 400);
    return () => clearTimeout(t);
  }, [branchId, startDate]);

  function applyPaymentPlan(planId: string) {
    setPaymentPlanId(planId);
    if (!planId) return;
    const plan = paymentPlans.find((p) => p.id === planId);
    if (!plan) return;
    setRegistrationFee(String(plan.registrationFee));
    setCourseFee(String(plan.courseFee));
    setInstallments(
      plan.lineItems.map((item, idx) => ({
        label: item.label,
        amount: item.amount,
        dueDate: startDate || "",
        order: idx,
      })),
    );
  }

  async function loadSessions(): Promise<boolean> {
    if (!branchId || !startDate || !endDate) {
      setError("Select branch and date range first");
      return false;
    }
    setSessionsLoading(true);
    setError(null);
    setSessionListError(null);
    try {
      const dates = await fetchSessionPreview(branchId, startDate, endDate);
      const rows = previewToEditableRows(
        dates,
        defaultClassTime,
        defaultClassEndTime,
      );
      setSessionDates(rows);
      return rows.length > 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
      return false;
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleNext() {
    setError(null);
    if (step === 1) {
      if (!name.trim() || !branchId || !startDate || !endDate) {
        setError("Fill in all required fields");
        return;
      }
      if (startDate >= endDate) {
        setError("End date must be after start date");
        return;
      }
      if (defaultClassEndTime.trim()) {
        const [sh, sm] = defaultClassTime.split(":").map(Number);
        const [eh, em] = defaultClassEndTime.split(":").map(Number);
        if (eh * 60 + em <= sh * 60 + sm) {
          setError("Default end time must be after default class time");
          return;
        }
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const installmentError = validateInstallmentStep(installments);
      if (installmentError) {
        setError(installmentError);
        return;
      }
      const ok = await loadSessions();
      if (!ok) return;
      setStep(3);
    }
  }

  async function handleCreate() {
    setError(null);
    setSessionListError(null);
    const installmentError = validateInstallmentStep(installments);
    if (installmentError) {
      setError(installmentError);
      return;
    }
    const selected = sessionDates.filter((d) => d.selected);
    if (selected.length === 0) {
      setError("Select at least one session date");
      return;
    }
    for (const row of selected) {
      const endTime = row.classEndTime.trim() || defaultClassEndTime.trim();
      if (endTime) {
        const [sh, sm] = row.classTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        if (eh * 60 + em <= sh * 60 + sm) {
          setError(
            `Session on ${row.date}: end time must be after start time`,
          );
          return;
        }
      }
    }
    const unique = new Set(selected.map((d) => d.date));
    if (unique.size !== selected.length) {
      setError("Duplicate session dates are not allowed");
      return;
    }
    setIsSubmitting(true);
    try {
      const body: CreateBatchBody = {
        name: name.trim(),
        branchId,
        startDate,
        endDate,
        defaultClassTime,
        ...(defaultClassEndTime.trim()
          ? { defaultClassEndTime: defaultClassEndTime.trim() }
          : {}),
        registrationFee: Number(registrationFee) || 0,
        courseFee: courseFeeNum,
        maxCapacity: maxCapacity ? Number(maxCapacity) : null,
        paymentPlanId: paymentPlanId || undefined,
        confirmedSessions: selected.map((row) => ({
          date: row.date,
          classTime: row.classTime,
          ...(row.classEndTime.trim()
            ? { classEndTime: row.classEndTime.trim() }
            : {}),
        })),
        installments: installments.map((inst, idx) => ({
          ...inst,
          order: idx,
        })),
      };
      const result = await onSubmit(body);
      setCreatedBatch({
        id: result.detail.id,
        batchCode: result.detail.batchCode,
      });
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create batch");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-base outline-none focus:border-primary-900 sm:text-sm";

  const titles: Record<WizardStep, string> = {
    1: "Create batch — Basic info",
    2: "Create batch — Installment plan",
    3: "Create batch — Session preview",
    success: "Batch created",
  };

  return (
    <Modal open={open} onClose={onClose} title={titles[step]} size="xl">
      {step === "success" && createdBatch ? (
        <div className="space-y-6 py-4 text-center">
          <p className="text-sm text-neutral-700">Your batch is ready.</p>
          <p className="font-headline text-3xl text-primary-900">
            {createdBatch.batchCode}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                onViewBatch(createdBatch.id);
                onClose();
              }}
              className="min-h-11 rounded-xl bg-primary-900 px-6 py-2.5 text-sm font-medium text-tertiary-100"
            >
              View batch
            </button>
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded-xl border border-secondary-400 px-6 py-2.5 text-sm font-medium text-primary-900"
            >
              Create another
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm text-neutral-700">Batch name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="January 2025 Intake"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm text-neutral-700">Branch</span>
                <Select
                  value={branchId}
                  onChange={setBranchId}
                  options={branchOptions}
                  placeholder={branchPlaceholder}
                  disabled={branchesLoading || branchOptions.length === 0}
                  aria-label="Branch"
                />
                {!branchesLoading && branchOptions.length === 0 ? (
                  <p className="text-xs text-destructive">
                    No active branches found. Add a branch before creating a batch.
                  </p>
                ) : null}
              </label>
              {codePreview ? (
                <p className="sm:col-span-2 font-mono text-sm text-neutral-600">
                  Batch code preview: <strong className="text-primary-900">{codePreview}</strong>
                </p>
              ) : null}
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">Start date</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">End date</span>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">Default class time</span>
                <input
                  type="time"
                  value={defaultClassTime}
                  onChange={(e) => setDefaultClassTime(e.target.value.slice(0, 5))}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">
                  Default end time <span className="text-neutral-500">(optional)</span>
                </span>
                <input
                  type="time"
                  value={defaultClassEndTime}
                  onChange={(e) =>
                    setDefaultClassEndTime(e.target.value.slice(0, 5))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">Max capacity (optional)</span>
                <input
                  type="number"
                  min={1}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 40"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">Registration fee</span>
                <input
                  type="number"
                  min={0}
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-neutral-700">Course fee</span>
                <input
                  type="number"
                  min={0}
                  value={courseFee}
                  onChange={(e) => setCourseFee(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="space-y-2 sm:col-span-2">
                <span className="text-sm text-neutral-700">Payment structure</span>
                <p className="text-xs text-neutral-500">
                  Plans are managed in Settings → Payment structure.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentPlanId("");
                      setInstallments([emptyInstallment(0)]);
                    }}
                    className={`min-w-[140px] rounded-xl border px-4 py-3 text-left text-sm transition ${
                      !paymentPlanId
                        ? "border-primary-900 bg-primary-900/5 ring-1 ring-primary-900"
                        : "border-secondary-400 bg-tertiary-100 hover:bg-secondary-100/50"
                    }`}
                  >
                    <span className="font-medium text-primary-900">Custom structure</span>
                    <p className="mt-1 text-xs text-neutral-600">Define instalments in step 2</p>
                  </button>
                  {paymentPlans.map((plan) => {
                    const selected = paymentPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => applyPaymentPlan(plan.id)}
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
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {feeMismatch ? (
                <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Installment total ({formatMoney(installmentTotal, currency)}) does not
                  match course fee ({formatMoney(courseFeeNum, currency)}). You can
                  still proceed.
                </p>
              ) : null}
              <ul className="space-y-3">
                {installments.map((inst, idx) => (
                  <li
                    key={idx}
                    className="grid gap-2 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
                  >
                    <input
                      value={inst.label}
                      onChange={(e) => {
                        const next = [...installments];
                        next[idx] = { ...inst, label: e.target.value };
                        setInstallments(next);
                      }}
                      className={inputClass}
                      placeholder="Label"
                    />
                    <input
                      type="number"
                      min={0}
                      value={inst.amount || ""}
                      onChange={(e) => {
                        const next = [...installments];
                        next[idx] = { ...inst, amount: Number(e.target.value) };
                        setInstallments(next);
                      }}
                      className={inputClass}
                      placeholder="Amount"
                    />
                    <input
                      type="date"
                      required
                      value={inst.dueDate}
                      onChange={(e) => {
                        const next = [...installments];
                        next[idx] = { ...inst, dueDate: e.target.value };
                        setInstallments(next);
                      }}
                      className={inputClass}
                      aria-label={`Due date for ${inst.label || `installment ${idx + 1}`}`}
                    />
                    <button
                      type="button"
                      disabled={installments.length <= 1}
                      onClick={() =>
                        setInstallments(installments.filter((_, i) => i !== idx))
                      }
                      className="flex size-11 items-center justify-center rounded-xl border border-secondary-400 text-destructive disabled:opacity-40"
                      aria-label="Remove installment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  setInstallments([
                    ...installments,
                    emptyInstallment(installments.length),
                  ])
                }
                className="inline-flex items-center gap-2 text-sm font-medium text-primary-900"
              >
                <Plus className="size-4" />
                Add installment
              </button>
              <p className="text-sm text-neutral-600">
                Total: {formatMoney(installmentTotal, currency)} · Course fee:{" "}
                {formatMoney(courseFeeNum, currency)}
              </p>
            </div>
          ) : null}

          {step === 3 ? (
            <CreateBatchSessionEditor
              rows={sessionDates}
              onChange={setSessionDates}
              startDate={startDate}
              endDate={endDate}
              defaultClassTime={defaultClassTime}
              defaultClassEndTime={defaultClassEndTime}
              isLoading={sessionsLoading}
              onRegenerate={() => void loadSessions()}
              listError={sessionListError}
              onListError={setSessionListError}
            />
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t border-secondary-300/50 pt-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === 1) onClose();
                else if (step === 2) setStep(1);
                else if (step === 3) setStep(2);
              }}
              className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            {step === 3 ? (
              <SubmitButton
                type="button"
                loading={isSubmitting}
                loadingText="Creating…"
                onClick={() => void handleCreate()}
              >
                Create batch
              </SubmitButton>
            ) : (
              <SubmitButton type="button" onClick={() => void handleNext()}>
                Next
              </SubmitButton>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
