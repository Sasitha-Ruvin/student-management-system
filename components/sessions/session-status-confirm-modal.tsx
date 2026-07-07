"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  SessionNotifyBlock,
  useSessionNotifyState,
} from "@/components/sessions/session-notify-block";
import { updateSession } from "@/lib/api/batches";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionEditNotificationSummary } from "@/lib/notifications/build-session-edit-warning";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";

type SessionStatusAction = "cancel" | "complete";

type SessionStatusConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  batchId: string;
  sessionId: string;
  sessionNumber: number;
  action: SessionStatusAction | null;
  /** Required for cancel SMS preview */
  scheduledAt?: string;
  batchCode?: string;
  batchName?: string;
  branchName?: string;
  branchLocation?: string;
};

const COPY: Record<
  SessionStatusAction,
  { title: string; body: string; confirm: string }
> = {
  cancel: {
    title: "Cancel session",
    body: "This session will be marked cancelled. Existing attendance records are kept for history.",
    confirm: "Cancel session",
  },
  complete: {
    title: "Complete session",
    body: "Mark this session as completed. You can still correct attendance afterwards.",
    confirm: "Mark completed",
  },
};

export function SessionStatusConfirmModal({
  open,
  onClose,
  onSuccess,
  batchId,
  sessionId,
  sessionNumber,
  action,
  scheduledAt,
  batchCode,
  batchName,
  branchName,
  branchLocation,
}: SessionStatusConfirmModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notify = useSessionNotifyState();

  useEffect(() => {
    if (!open) return;
    notify.reset();
    setError(null);
  }, [open, action]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!action) return null;

  const copy = COPY[action];
  const showNotify = action === "cancel";

  const previewContext =
    showNotify && scheduledAt && batchCode && branchName
      ? {
          sessionNumber,
          scheduledAt,
          batchCode,
          batchName,
          branchName,
          branchLocation,
        }
      : null;

  async function handleConfirm() {
    if (!action) return;

    if (action === "cancel" && notify.notifyStudents) {
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
      const result = await updateSession(
        batchId,
        sessionId,
        action === "cancel"
          ? {
              action: "cancel",
              notifyStudents: notify.notifyStudents,
              studentMessage: notify.notifyStudents
                ? notify.studentMessage.trim() || undefined
                : undefined,
              templateId: notify.notifyStudents ? notify.templateId : undefined,
            }
          : { action },
      );

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
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${copy.title} #${sessionNumber}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">{copy.body}</p>

        {showNotify ? (
          <SessionNotifyBlock
            enabled={notify.notifyStudents}
            onEnabledChange={notify.setNotifyStudents}
            message={notify.studentMessage}
            onMessageChange={notify.setStudentMessage}
            templateId={notify.templateId}
            onTemplateIdChange={notify.setTemplateId}
            previewContext={previewContext}
            hint="Notify enrolled students that this session is cancelled (off by default)."
          />
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            Go back
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            onClick={() => void handleConfirm()}
            className={action === "cancel" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {copy.confirm}
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
