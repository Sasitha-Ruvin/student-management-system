"use client";

import { useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateBatchInstallmentTemplates } from "@/lib/api/batches";
import { formatMoney } from "@/lib/format/money";
import { Plus, Trash2 } from "@/lib/icons";
import type {
  BatchDetail,
  BatchFinanceSummary,
  InstallmentInput,
  InstallmentTemplateDto,
} from "@/types/api/batch";

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 py-2 text-sm text-primary-900";

type BatchInstallmentScheduleEditorProps = {
  batch: BatchDetail;
  finance: BatchFinanceSummary | null;
  currency?: string;
  onSaved: () => void;
};

function templateToInput(t: InstallmentTemplateDto): InstallmentInput {
  const due = t.dueDate.slice(0, 10);
  return { label: t.label, amount: t.amount, dueDate: due, order: t.order };
}

function emptyInstallment(order: number): InstallmentInput {
  return { label: `Installment ${order + 1}`, amount: 0, dueDate: "", order };
}

function validateInstallments(installments: InstallmentInput[]): string | null {
  if (installments.length === 0) return "Add at least one instalment";
  if (installments.some((i) => !i.label.trim())) {
    return "Each instalment must have a label";
  }
  if (installments.some((i) => !i.dueDate.trim())) {
    return "Due dates are required for all instalments";
  }
  if (installments.some((i) => typeof i.amount !== "number" || i.amount <= 0)) {
    return "Each instalment amount must be positive";
  }
  return null;
}

function isoDateOnly(value: string): string {
  return value.slice(0, 10);
}

type SyncPreview = {
  dueDatesUpdated: number;
  amountsUpdated: number;
  skipped: number;
};

function estimateSyncPreview(
  original: InstallmentTemplateDto[],
  edited: InstallmentInput[],
  finance: BatchFinanceSummary | null,
  applyToExisting: boolean,
): SyncPreview {
  if (!applyToExisting || !finance || finance.enrollmentCount === 0) {
    return { dueDatesUpdated: 0, amountsUpdated: 0, skipped: 0 };
  }

  const n = finance.enrollmentCount;
  const financeByOrder = new Map(finance.installments.map((i) => [i.order, i]));
  const originalByOrder = new Map(original.map((t) => [t.order, t]));

  let dueDatesUpdated = 0;
  let amountsUpdated = 0;
  let skipped = 0;

  for (const row of edited) {
    const prev = originalByOrder.get(row.order);
    const fin = financeByOrder.get(row.order);
    const dueChanged =
      !prev || isoDateOnly(prev.dueDate) !== isoDateOnly(row.dueDate);
    const amountChanged = !prev || prev.amount !== row.amount;

    if (dueChanged) dueDatesUpdated += n;

    if (amountChanged) {
      const paidStudents =
        fin && fin.amountPerStudent > 0
          ? Math.round(fin.totalCollected / fin.amountPerStudent)
          : 0;
      const unpaid = Math.max(0, n - paidStudents);
      amountsUpdated += unpaid;
      skipped += paidStudents;
    }
  }

  for (const prev of original) {
    if (!edited.some((e) => e.order === prev.order)) {
      const fin = financeByOrder.get(prev.order);
      const paidStudents =
        fin && fin.amountPerStudent > 0
          ? Math.round(fin.totalCollected / fin.amountPerStudent)
          : 0;
      skipped += paidStudents;
    }
  }

  return { dueDatesUpdated, amountsUpdated, skipped };
}

export function BatchInstallmentScheduleEditor({
  batch,
  finance,
  currency = "LKR",
  onSaved,
}: BatchInstallmentScheduleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [installments, setInstallments] = useState<InstallmentInput[]>(() =>
    batch.installmentTemplates.map(templateToInput),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const courseFeeNum = batch.courseFee;
  const installmentTotal = useMemo(
    () => installments.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [installments],
  );
  const feeMismatch =
    courseFeeNum > 0 && Math.abs(installmentTotal - courseFeeNum) > 0.01;

  const syncPreview = useMemo(
    () =>
      estimateSyncPreview(
        batch.installmentTemplates,
        installments.map((inst, idx) => ({ ...inst, order: idx })),
        finance,
        applyToExisting,
      ),
    [batch.installmentTemplates, installments, finance, applyToExisting],
  );

  function startEdit() {
    setInstallments(batch.installmentTemplates.map(templateToInput));
    setError(null);
    setSaveMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setConfirmOpen(false);
    setApplyToExisting(false);
  }

  function openConfirm() {
    const validationError = validateInstallments(installments);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function handleSave() {
    setError(null);
    const validationError = validateInstallments(installments);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const result = await updateBatchInstallmentTemplates(batch.id, {
        templates: installments.map((inst, idx) => ({ ...inst, order: idx })),
        applyToExisting,
      });

      setConfirmOpen(false);
      setEditing(false);
      setApplyToExisting(false);

      const { sync } = result;
      const parts: string[] = ["Instalment schedule saved."];
      if (applyToExisting) {
        parts.push(
          `${sync.dueDatesUpdated} due date(s), ${sync.amountsUpdated} amount(s) updated.`,
        );
        if (sync.skipped.length > 0) {
          parts.push(`${sync.skipped.length} line(s) skipped (paid or cancelled).`);
        }
      }
      if (result.warning) parts.push(result.warning);
      setSaveMessage(parts.join(" "));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {saveMessage ? (
          <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {saveMessage}
          </p>
        ) : null}
        <button
          type="button"
          onClick={startEdit}
          className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
        >
          Edit schedule
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-secondary-300/50 bg-secondary-100/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-primary-900">Edit instalment schedule</h3>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-sm text-neutral-600 underline"
          >
            Cancel
          </button>
        </div>

        {feeMismatch ? (
          <p className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Instalment total ({formatMoney(installmentTotal, currency)}) does not match
            course fee ({formatMoney(courseFeeNum, currency)}). You can still save.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <ul className="space-y-3">
          {installments.map((inst, idx) => (
            <li
              key={idx}
              className="grid gap-2 rounded-xl border border-secondary-300/60 bg-tertiary-100 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
            >
              <input
                value={inst.label}
                onChange={(e) => {
                  const next = [...installments];
                  next[idx] = { ...inst, label: e.target.value };
                  setInstallments(next);
                }}
                placeholder="Label"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={inst.amount || ""}
                onChange={(e) => {
                  const next = [...installments];
                  next[idx] = { ...inst, amount: Number(e.target.value) };
                  setInstallments(next);
                }}
                placeholder="Amount"
                className={inputClass}
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
                aria-label={`Due date for ${inst.label || `instalment ${idx + 1}`}`}
              />
              <button
                type="button"
                disabled={installments.length <= 1}
                onClick={() => setInstallments(installments.filter((_, i) => i !== idx))}
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
          onClick={() =>
            setInstallments([...installments, emptyInstallment(installments.length)])
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-900"
        >
          <Plus className="size-4" />
          Add instalment
        </button>

        <p className="text-sm text-neutral-600">
          Total: {formatMoney(installmentTotal, currency)} · Course fee:{" "}
          {formatMoney(courseFeeNum, currency)}
        </p>

        <SubmitButton
          type="button"
          onClick={openConfirm}
          className="min-h-11 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100"
        >
          Save schedule
        </SubmitButton>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save instalment schedule"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            This will replace the batch instalment template schedule
            ({installments.length} line{installments.length === 1 ? "" : "s"}).
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-secondary-300/60 bg-secondary-100/40 p-3">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="mt-1 size-4 rounded border-secondary-400"
            />
            <span className="text-sm text-primary-900">
              Apply to existing students on batch structure
              <span className="mt-1 block text-neutral-600">
                Due dates always sync. Amounts and labels only update on unpaid
                instalment lines.
              </span>
            </span>
          </label>

          {applyToExisting && finance && finance.enrollmentCount > 0 ? (
            <div className="rounded-xl border border-secondary-300/50 bg-tertiary-100 px-3 py-2 text-sm text-neutral-700">
              <p className="font-medium text-primary-900">Estimated sync</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{syncPreview.dueDatesUpdated} due date update(s)</li>
                <li>{syncPreview.amountsUpdated} amount update(s)</li>
                <li>{syncPreview.skipped} skipped (paid lines)</li>
              </ul>
              <p className="mt-2 text-xs text-neutral-500">
                Actual counts may differ slightly after save.
              </p>
            </div>
          ) : null}

          {feeMismatch ? (
            <p className="text-sm text-amber-800">
              Warning: instalment total does not match course fee.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <SubmitButton
              type="button"
              onClick={() => void handleSave()}
              className="min-h-11 flex-1 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100 sm:flex-none"
            >
              Confirm save
            </SubmitButton>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm text-neutral-700"
            >
              Back
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
