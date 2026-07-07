"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  SessionNotifyBlock,
  useSessionNotifyState,
} from "@/components/sessions/session-notify-block";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { updateSession } from "@/lib/api/batches";
import {
  parseColomboFormDatetime,
  toDatetimeLocalValue,
} from "@/lib/sessions/session-datetime-form";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionEditNotificationSummary } from "@/lib/notifications/build-session-edit-warning";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";
import type { SessionListItem } from "@/types/api/batch";

type RescheduleSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  session: Pick<
    SessionListItem,
    | "id"
    | "batchId"
    | "scheduledAt"
    | "branchId"
    | "sessionNumber"
    | "branchName"
    | "batchCode"
    | "batchName"
  > & { branchLocation?: string } | null;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

export function RescheduleSessionModal({
  open,
  onClose,
  onSuccess,
  session,
}: RescheduleSessionModalProps) {
  const { branches } = useBranchesPicker();
  const [scheduledAt, setScheduledAt] = useState("");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useSessionNotifyState();

  useEffect(() => {
    if (!open || !session) return;
    setScheduledAt(toDatetimeLocalValue(session.scheduledAt));
    setBranchId(session.branchId);
    setError(null);
    notify.reset();
  }, [open, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.branchCode})`,
  }));

  const previewScheduledAt = useMemo(() => {
    if (!scheduledAt) return session?.scheduledAt ?? "";
    const d = parseColomboFormDatetime(scheduledAt);
    return isNaN(d.getTime()) ? session?.scheduledAt ?? "" : d.toISOString();
  }, [scheduledAt, session?.scheduledAt]);

  const previewContext = session
    ? {
        sessionNumber: session.sessionNumber,
        scheduledAt: previewScheduledAt,
        batchCode: session.batchCode,
        batchName: session.batchName,
        branchName:
          branches.find((b) => b.id === branchId)?.name ?? session.branchName,
        branchLocation: session.branchLocation,
      }
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const date = parseColomboFormDatetime(scheduledAt);
    if (isNaN(date.getTime())) {
      setError("Invalid date/time");
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
      const result = await updateSession(session.batchId, session.id, {
        action: "reschedule",
        scheduledAt: date.toISOString(),
        notifyStudents: notify.notifyStudents,
        studentMessage: notify.notifyStudents
          ? notify.studentMessage.trim() || undefined
          : undefined,
        templateId: notify.notifyStudents ? notify.templateId : undefined,
      });

      if (branchId !== session.branchId) {
        await updateSession(session.batchId, session.id, {
          action: "relocate",
          branchId,
        });
      }

      let toast: string | undefined;
      if (result?.smsResult) {
        const summary = buildSessionEditNotificationSummary(undefined, result.smsResult);
        toast = summary.warning
          ? `${summary.message} ${summary.warning}`
          : summary.message;
      }

      onSuccess(toast);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reschedule session #${session.sessionNumber}`}
      size="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            New date & time
          </span>
          <input
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
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

        <SessionNotifyBlock
          enabled={notify.notifyStudents}
          onEnabledChange={notify.setNotifyStudents}
          message={notify.studentMessage}
          onMessageChange={notify.setStudentMessage}
          templateId={notify.templateId}
          onTemplateIdChange={notify.setTemplateId}
          previewContext={previewContext}
          hint="Send an SMS about the new session date (off by default)."
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
          <SubmitButton loading={isSubmitting}>Save changes</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
