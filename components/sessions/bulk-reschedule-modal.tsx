"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  SessionNotifyBlock,
  useSessionNotifyState,
} from "@/components/sessions/session-notify-block";
import { bulkRescheduleSessions } from "@/lib/api/batches";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionEditNotificationSummary } from "@/lib/notifications/build-session-edit-warning";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";

type BulkRescheduleModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  batchId: string;
  batchCode?: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

export function BulkRescheduleModal({
  open,
  onClose,
  onSuccess,
  batchId,
  batchCode = "Batch",
}: BulkRescheduleModalProps) {
  const [fromDate, setFromDate] = useState("");
  const [pushDays, setPushDays] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useSessionNotifyState();

  useEffect(() => {
    if (!open) return;
    notify.reset();
    setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const days = Number(pushDays);
    if (!fromDate) {
      setError("From date is required");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Push days must be between 1 and 365");
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
      const result = await bulkRescheduleSessions(batchId, fromDate, days, {
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
      }
      if (result.warning) {
        toast = toast ? `${toast} ${result.warning}` : result.warning;
      }

      onSuccess(toast ?? `${result.updatedCount} session(s) rescheduled.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk reschedule failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewContext = fromDate
    ? {
        sessionNumber: 1,
        scheduledAt: new Date(`${fromDate}T09:00:00+05:30`).toISOString(),
        batchCode,
        branchName: "Branch",
      }
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Bulk reschedule sessions" size="md">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-sm text-neutral-600">
          Moves all scheduled and rescheduled sessions on or after the from date forward
          by the specified number of days. Batch end date is extended automatically.
        </p>
        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            From date
          </span>
          <input
            type="date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Push forward (days)
          </span>
          <input
            type="number"
            min={1}
            max={365}
            required
            value={pushDays}
            onChange={(e) => setPushDays(e.target.value)}
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
          hint="Sends one SMS per affected session per student (v1)."
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
          <SubmitButton loading={isSubmitting}>Reschedule all</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
