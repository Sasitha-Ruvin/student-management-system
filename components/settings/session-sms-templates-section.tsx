"use client";

import { useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { SESSION_SMS_PLACEHOLDERS } from "@/lib/sms/session-sms-placeholders";
import {
  buildSessionSmsContext,
  renderSessionSmsTemplate,
} from "@/lib/sms/render-session-sms-template";
import type {
  CreateSessionSmsTemplateBody,
  SessionSmsTemplateDto,
  UpdateSessionSmsTemplateBody,
} from "@/types/api/settings";

const textareaClass =
  "min-h-[200px] w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 font-mono text-xs leading-relaxed focus:border-primary-900 focus:outline-none";

const PREVIEW_CTX = buildSessionSmsContext({
  academyName: "The Walk Model Academy",
  studentFirstName: "Student",
  sessionNumber: 3,
  batchCode: "COL-2026-MAY",
  batchName: "May 2026 Intake",
  scheduledAt: new Date().toISOString(),
  branchName: "Colombo Branch",
  branchLocation: "Main Hall",
  contactPhone: "0776440080",
  notice: "SAMPLE NOTICE FOR PREVIEW",
});

type SessionSmsTemplatesSectionProps = {
  templates: SessionSmsTemplateDto[];
  onCreate: (body: CreateSessionSmsTemplateBody) => Promise<void>;
  onUpdate: (id: string, body: UpdateSessionSmsTemplateBody) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function SessionSmsTemplatesSection({
  templates,
  onCreate,
  onUpdate,
  onDelete,
}: SessionSmsTemplatesSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SessionSmsTemplateDto | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo(() => {
    if (!body.trim()) return null;
    try {
      return renderSessionSmsTemplate(body, PREVIEW_CTX);
    } catch {
      return null;
    }
  }, [body]);

  function openCreate() {
    setEditing(null);
    setName("");
    setBody("");
    setIsDefault(templates.length === 0);
    setError(null);
    setEditorOpen(true);
  }

  function openEdit(t: SessionSmsTemplateDto) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
    setIsDefault(t.isDefault);
    setError(null);
    setEditorOpen(true);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await onUpdate(editing.id, { name, body, isDefault });
      } else {
        await onCreate({ name, body, isDefault });
      }
      setEditorOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(t: SessionSmsTemplateDto) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await onDelete(t.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="mt-8 border-t border-secondary-300/60 pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-headline text-lg text-primary-900">
            Session SMS templates
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Full-message templates for the session Message action. Use placeholders;
            <code className="mx-1 rounded bg-secondary-200 px-1">{"{{notice}}"}</code>
            is inserted as you type it.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-10 rounded-xl bg-primary-900 px-4 py-2 text-sm font-medium text-tertiary-100"
        >
          Add template
        </button>
      </div>

      <p className="mb-3 text-xs text-neutral-500">
        Placeholders:{" "}
        {SESSION_SMS_PLACEHOLDERS.map((p) => `{{${p}}}`).join(", ")}
      </p>

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-secondary-400 px-4 py-6 text-center text-sm text-neutral-600">
          No templates yet. Add one or run the database migration to seed the default.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-secondary-300/60 bg-secondary-100/30 px-4 py-3"
            >
              <div>
                <span className="font-medium text-primary-900">{t.name}</span>
                {t.isDefault ? (
                  <span className="ml-2 rounded-full bg-primary-900/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-900">
                    Default
                  </span>
                ) : null}
                <p className="mt-0.5 text-xs text-neutral-500">
                  {t.body.length} characters
                  {t.body.includes("{{notice}}") ? " · includes notice" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium"
                >
                  Edit
                </button>
                {!t.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void onUpdate(t.id, { isDefault: true })}
                    className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium"
                  >
                    Set default
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={templates.length <= 1}
                  onClick={() => void handleDelete(t)}
                  className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit SMS template" : "New SMS template"}
        size="lg"
      >
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-secondary-400 px-3 text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Message body
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={textareaClass}
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4 rounded border-secondary-400"
            />
            <span className="text-sm text-neutral-700">Default template</span>
          </label>

          {preview ? (
            <div className="rounded-xl border border-secondary-300/60 bg-secondary-100/40 p-3">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-neutral-600 uppercase">
                Preview
              </p>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-primary-900">
                {preview}
              </pre>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={isSubmitting}
              loadingText="Saving…"
              onClick={() => void handleSave()}
            >
              Save template
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
