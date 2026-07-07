"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSession } from "@/lib/api/batches";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionEditNotificationSummary } from "@/lib/notifications/build-session-edit-warning";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { buildSessionSmsBody } from "@/lib/sms/build-session-sms-body";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";
import type { SessionSmsTemplateDto } from "@/types/api/settings";

const textareaClass =
  "min-h-[88px] w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

const BUILTIN_OPTION = "__builtin__";

export type EditSessionModalSession = {
  id: string;
  batchId: string;
  sessionNumber: number;
  scheduledAt: string;
  branchName: string;
  branchLocation?: string;
  batchCode: string;
  batchName?: string;
  status: string;
};

type EditSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  session: EditSessionModalSession | null;
  academyName?: string;
};

export function EditSessionModal({
  open,
  onClose,
  onSuccess,
  session,
  academyName = "The Walk Model Academy",
}: EditSessionModalProps) {
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<SessionSmsTemplateDto[]>([]);
  const [templateId, setTemplateId] = useState<string>(BUILTIN_OPTION);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setError(null);
    void fetchSessionSmsTemplates()
      .then((list) => {
        setTemplates(list);
        const def = list.find((t) => t.isDefault);
        setTemplateId(def?.id ?? BUILTIN_OPTION);
      })
      .catch(() => {
        setTemplates([]);
        setTemplateId(BUILTIN_OPTION);
      });
  }, [open]);

  const selectedTemplate = useMemo(() => {
    if (templateId === BUILTIN_OPTION) return null;
    return templates.find((t) => t.id === templateId) ?? null;
  }, [templateId, templates]);

  const templateBody =
    selectedTemplate?.body ?? DEFAULT_SESSION_SMS_TEMPLATE_BODY;

  const showNoticeField = templateRequiresNotice(templateBody);

  const templateOptions = useMemo(
    () => [
      { value: BUILTIN_OPTION, label: "Built-in default" },
      ...templates.map((t) => ({
        value: t.id,
        label: t.isDefault ? `${t.name} (default)` : t.name,
      })),
    ],
    [templates],
  );

  const smsPreview = useMemo(() => {
    if (!session) return null;
    if (showNoticeField && !message.trim()) return null;
    try {
      return buildSessionSmsBody({
        sessionNumber: session.sessionNumber,
        batchCode: session.batchCode,
        batchName: session.batchName ?? session.batchCode,
        scheduledAt: session.scheduledAt,
        branchName: session.branchName,
        branchLocation: session.branchLocation ?? "",
        message: message.trim() || "SAMPLE NOTICE",
        contactPhone: null,
        studentFirstName: "Student",
        academyName,
        templateBody,
      });
    } catch {
      return null;
    }
  }, [session, message, templateBody, academyName, showNoticeField]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    const trimmed = message.trim();
    if (showNoticeField && !trimmed) {
      setError("Enter a message for students");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateSession(session.batchId, session.id, {
        action: "edit",
        studentMessage: trimmed || undefined,
        templateId:
          templateId === BUILTIN_OPTION ? null : templateId,
      });

      const { message: summary, warning, success } =
        buildSessionEditNotificationSummary(undefined, result?.smsResult);

      if (!success) {
        setError(warning ?? summary);
        return;
      }

      const toast = warning ? `${summary} ${warning}` : summary;
      onSuccess(toast);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!session) return null;

  const scheduledLabel = new Date(session.scheduledAt).toLocaleString();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Message — Session #${session.sessionNumber}`}
      size="md"
    >
      <p className="mb-4 text-sm text-neutral-600">
        {session.batchCode} · {scheduledLabel} · {session.branchName}
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            SMS template (optional)
          </span>
          <Select
            value={templateId}
            onChange={setTemplateId}
            options={templateOptions}
            aria-label="SMS template"
          />
          <p className="text-xs text-neutral-500">
            Choose a template from Settings → Academy, or use the built-in default.
          </p>
        </label>

        {showNoticeField ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Notice
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="e.g. Next session is on Saturday at 10am. Please bring your portfolio."
              className={textareaClass}
              autoFocus
            />
            <p className="text-xs text-neutral-500">
              Fills <code className="rounded bg-secondary-200 px-1">{"{{notice}}"}</code> in
              the template. Sent by SMS to enrolled students; appears in{" "}
              <strong>capital letters</strong>.
            </p>
          </label>
        ) : (
          <p className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 px-3 py-2 text-sm text-neutral-700">
            This template has no notice placeholder — the same message will be sent to
            all enrolled students.
          </p>
        )}

        {smsPreview ? (
          <div className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 p-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-neutral-600 uppercase">
              SMS preview
            </p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-primary-900">
              {smsPreview}
            </pre>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <SubmitButton loading={isSubmitting} loadingText="Messaging…">
            Message
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
