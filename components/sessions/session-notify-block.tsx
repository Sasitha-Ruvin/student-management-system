"use client";

import { useEffect, useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import { fetchSessionSmsTemplates } from "@/lib/api/settings";
import { buildSessionSmsBody } from "@/lib/sms/build-session-sms-body";
import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";
import type { SessionSmsTemplateDto } from "@/types/api/settings";

const textareaClass =
  "min-h-[88px] w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none";

const BUILTIN_OPTION = "__builtin__";

export type SessionNotifyPreviewContext = {
  sessionNumber: number;
  scheduledAt: string;
  batchCode: string;
  batchName?: string;
  branchName: string;
  branchLocation?: string;
};

export type SessionNotifyState = {
  notifyStudents: boolean;
  studentMessage: string;
  templateId: string | null;
};

type SessionNotifyBlockProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  message: string;
  onMessageChange: (value: string) => void;
  templateId: string | null;
  onTemplateIdChange: (value: string | null) => void;
  previewContext: SessionNotifyPreviewContext | null;
  academyName?: string;
  /** Shown when checkbox is off */
  hint?: string;
};

export function useSessionNotifyState(): SessionNotifyState & {
  setNotifyStudents: (v: boolean) => void;
  setStudentMessage: (v: string) => void;
  setTemplateId: (v: string | null) => void;
  reset: () => void;
} {
  const [notifyStudents, setNotifyStudents] = useState(false);
  const [studentMessage, setStudentMessage] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  return {
    notifyStudents,
    studentMessage,
    templateId,
    setNotifyStudents,
    setStudentMessage,
    setTemplateId,
    reset: () => {
      setNotifyStudents(false);
      setStudentMessage("");
      setTemplateId(null);
    },
  };
}

export function SessionNotifyBlock({
  enabled,
  onEnabledChange,
  message,
  onMessageChange,
  templateId,
  onTemplateIdChange,
  previewContext,
  academyName = "The Walk Model Academy",
  hint = "Optional — send an SMS to enrolled students.",
}: SessionNotifyBlockProps) {
  const [templates, setTemplates] = useState<SessionSmsTemplateDto[]>([]);

  useEffect(() => {
    void fetchSessionSmsTemplates()
      .then((list) => {
        setTemplates(list);
        if (templateId === null) {
          const def = list.find((t) => t.isDefault);
          if (def) onTemplateIdChange(def.id);
        }
      })
      .catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load templates once
  }, []);

  const selectedTemplate = useMemo(() => {
    if (!templateId) return null;
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

  const selectValue = templateId ?? BUILTIN_OPTION;

  const smsPreview = useMemo(() => {
    if (!enabled || !previewContext) return null;
    if (showNoticeField && !message.trim()) return null;
    try {
      return buildSessionSmsBody({
        sessionNumber: previewContext.sessionNumber,
        batchCode: previewContext.batchCode,
        batchName: previewContext.batchName ?? previewContext.batchCode,
        scheduledAt: previewContext.scheduledAt,
        branchName: previewContext.branchName,
        branchLocation: previewContext.branchLocation ?? "",
        message: message.trim() || "SAMPLE NOTICE",
        contactPhone: null,
        studentFirstName: "Student",
        academyName,
        templateBody,
      });
    } catch {
      return null;
    }
  }, [enabled, previewContext, message, templateBody, academyName, showNoticeField]);

  return (
    <div className="space-y-3 rounded-xl border border-secondary-300/60 bg-secondary-100/30 p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-1 size-4 rounded border-secondary-400"
        />
        <span className="text-sm text-primary-900">
          Notify students by SMS
          <span className="mt-1 block text-neutral-600">{hint}</span>
        </span>
      </label>

      {enabled ? (
        <>
          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              SMS template
            </span>
            <Select
              value={selectValue}
              onChange={(v) =>
                onTemplateIdChange(v === BUILTIN_OPTION ? null : v)
              }
              options={templateOptions}
              aria-label="SMS template"
            />
          </label>

          {showNoticeField ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
                Notice
              </span>
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                rows={4}
                placeholder="e.g. Session rescheduled — see updated date below."
                className={textareaClass}
              />
            </label>
          ) : (
            <p className="text-sm text-neutral-700">
              This template has no notice placeholder — the same message goes to all
              enrolled students.
            </p>
          )}

          {smsPreview ? (
            <div className="rounded-xl border border-secondary-300/60 bg-tertiary-100 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-neutral-600 uppercase">
                SMS preview
              </p>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-primary-900">
                {smsPreview}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function validateSessionNotify(
  enabled: boolean,
  message: string,
  templateId: string | null,
  templates: SessionSmsTemplateDto[],
): string | null {
  if (!enabled) return null;

  const selected = templateId
    ? templates.find((t) => t.id === templateId)
    : null;
  const body = selected?.body ?? DEFAULT_SESSION_SMS_TEMPLATE_BODY;

  if (templateRequiresNotice(body) && !message.trim()) {
    return "Enter a message for students";
  }
  return null;
}
