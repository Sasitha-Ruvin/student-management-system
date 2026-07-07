"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SessionNotifyBlock,
  useSessionNotifyState,
} from "@/components/sessions/session-notify-block";
import { SessionPinField } from "@/components/sessions/session-pin-field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { createExtraSession, fetchBatches } from "@/lib/api/batches";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionEditNotificationSummary } from "@/lib/notifications/build-session-edit-warning";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import {
  parseColomboFormDatetime,
  parseOptionalEndTime,
} from "@/lib/sessions/session-datetime-form";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";
import { useBranchFilter } from "@/stores/branch-filter-store";
import type { BatchListItem } from "@/types/api/batch";

type ScheduleSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  fixedBatchId?: string;
  fixedBatchLabel?: string;
  defaultBranchId?: string;
  defaultBatchId?: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

export function ScheduleSessionModal({
  open,
  onClose,
  onSuccess,
  fixedBatchId,
  fixedBatchLabel,
  defaultBranchId,
  defaultBatchId,
}: ScheduleSessionModalProps) {
  const { branches } = useBranchesPicker();
  const { selectedBranchId } = useBranchFilter();
  const effectiveBranchId = defaultBranchId ?? selectedBranchId ?? "";
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchId, setBatchId] = useState(fixedBatchId ?? defaultBatchId ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");
  const [pin, setPin] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useSessionNotifyState();

  useEffect(() => {
    if (!open) return;
    setBatchId(fixedBatchId ?? defaultBatchId ?? "");
    setScheduledAt("");
    setScheduledEndAt("");
    setBranchId(effectiveBranchId);
    setPin("");
    setNotes("");
    setError(null);
    notify.reset();
    if (!fixedBatchId) {
      setLoadingBatches(true);
      setBatches([]);
      void fetchBatches({
        status: "all",
        limit: 100,
        branchId: effectiveBranchId || undefined,
      })
        .then((p) =>
          setBatches(
            p.items.filter((b) => b.status === "OPEN" || b.status === "ACTIVE"),
          ),
        )
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load batches");
        })
        .finally(() => setLoadingBatches(false));
    }
  }, [open, fixedBatchId, defaultBatchId, effectiveBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const batchOptions = useMemo(
    () => [
      { value: "", label: loadingBatches ? "Loading…" : "Select batch…" },
      ...batches.map((b) => ({
        value: b.id,
        label: `${b.batchCode} — ${b.name}`,
      })),
    ],
    [batches, loadingBatches],
  );

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.branchCode})`,
  }));

  const targetBatchId = fixedBatchId ?? batchId;
  const selectedBatch = batches.find((b) => b.id === targetBatchId);

  const previewScheduledAt = useMemo(() => {
    if (!scheduledAt) return "";
    const d = parseColomboFormDatetime(scheduledAt);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }, [scheduledAt]);

  const previewContext =
    targetBatchId && previewScheduledAt
      ? {
          sessionNumber: (selectedBatch?.sessionCount ?? 0) + 1,
          scheduledAt: previewScheduledAt,
          batchCode: selectedBatch?.batchCode ?? fixedBatchLabel ?? "—",
          batchName: selectedBatch?.name,
          branchName:
            branches.find((b) => b.id === branchId)?.name ??
            selectedBatch?.branchName ??
            "—",
        }
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetBatchId) {
      setError("Select a batch");
      return;
    }
    if (!scheduledAt) {
      setError("Session date and time are required");
      return;
    }
    const date = parseColomboFormDatetime(scheduledAt);
    if (isNaN(date.getTime())) {
      setError("Invalid date/time");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    const { end: endDate, error: endError } = parseOptionalEndTime(
      scheduledAt,
      scheduledEndAt,
    );
    if (endError) {
      setError(endError);
      return;
    }

    if (notify.notifyStudents) {
      const templates = await fetchSessionSmsTemplates().catch(() => []);
      const selected = notify.templateId
        ? templates.find((t) => t.id === notify.templateId)
        : null;
      const body = selected?.body ?? DEFAULT_SESSION_SMS_TEMPLATE_BODY;
      if (templateRequiresNotice(body) && !notify.studentMessage.trim()) {
        setError("Enter a message for students");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createExtraSession(targetBatchId, {
        scheduledAt: date.toISOString(),
        scheduledEndAt: endDate ? endDate.toISOString() : null,
        branchId: branchId || undefined,
        pin: pin || null,
        notes: notes.trim() || null,
        notifyStudents: notify.notifyStudents,
        studentMessage: notify.notifyStudents
          ? notify.studentMessage.trim() || undefined
          : undefined,
        templateId: notify.notifyStudents ? notify.templateId : undefined,
      });

      let toast: string | undefined;
      if (result.smsResult) {
        const summary = buildSessionEditNotificationSummary(undefined, result.smsResult);
        toast = summary.warning
          ? `${summary.message} ${summary.warning}`
          : summary.message;
      } else if (result.smsWarning) {
        toast = `Session scheduled. ${result.smsWarning}`;
      } else if (result.warnings?.length) {
        toast = `Session scheduled. ${result.warnings.join(" ")}`;
      }

      onSuccess(toast);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule session");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule session" size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {fixedBatchId ? (
          <p className="text-sm text-neutral-700">
            Batch: <span className="font-medium text-primary-900">{fixedBatchLabel}</span>
          </p>
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Batch
            </span>
            <Select
              value={batchId}
              onChange={setBatchId}
              options={batchOptions}
              disabled={loadingBatches}
              aria-label="Batch"
            />
          </div>
        )}

        <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Start date & time <span className="normal-case text-neutral-500">(Sri Lanka)</span>
            </span>
          <input
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            End date & time{" "}
            <span className="normal-case text-neutral-500">(optional)</span>
          </span>
          <input
            type="datetime-local"
            value={scheduledEndAt}
            onChange={(e) => setScheduledEndAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Branch location
          </span>
          <Select
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            aria-label="Branch location"
          />
        </div>

        <SessionPinField value={pin} onChange={setPin} />

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>

        <SessionNotifyBlock
          enabled={notify.notifyStudents}
          onEnabledChange={notify.setNotifyStudents}
          message={notify.studentMessage}
          onMessageChange={notify.setStudentMessage}
          templateId={notify.templateId}
          onTemplateIdChange={notify.setTemplateId}
          previewContext={previewContext}
          hint="Optional — notify enrolled students about the new session by SMS."
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <SubmitButton loading={isSubmitting}>Schedule session</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
