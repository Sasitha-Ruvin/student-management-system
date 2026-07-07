"use client";

import { useState } from "react";

import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { SessionSmsTemplatesSection } from "@/components/settings/session-sms-templates-section";
import type {
  AcademySettingsDto,
  CreateSessionSmsTemplateBody,
  SessionSmsTemplateDto,
  UpdateSessionSmsTemplateBody,
} from "@/types/api/settings";

const CURRENCY_OPTIONS = [
  { value: "LKR", label: "LKR" },
  { value: "USD", label: "USD" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Colombo", label: "Asia/Colombo" },
  { value: "UTC", label: "UTC" },
];

type AcademyTabProps = {
  settings: AcademySettingsDto;
  sessionSmsTemplates: SessionSmsTemplateDto[];
  onSave: (data: Partial<AcademySettingsDto>) => Promise<void>;
  onCreateSmsTemplate: (body: CreateSessionSmsTemplateBody) => Promise<void>;
  onUpdateSmsTemplate: (
    id: string,
    body: UpdateSessionSmsTemplateBody,
  ) => Promise<void>;
  onDeleteSmsTemplate: (id: string) => Promise<void>;
};

export function AcademyTab({
  settings,
  sessionSmsTemplates,
  onSave,
  onCreateSmsTemplate,
  onUpdateSmsTemplate,
  onDeleteSmsTemplate,
}: AcademyTabProps) {
  const [academyName, setAcademyName] = useState(settings.academyName);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(settings.contactPhone ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [attendanceWindowBeforeMinutes, setAttendanceWindowBeforeMinutes] =
    useState(settings.attendanceWindowBeforeMinutes);
  const [attendanceWindowAfterMinutes, setAttendanceWindowAfterMinutes] =
    useState(settings.attendanceWindowAfterMinutes);
  const [attendancePinLength, setAttendancePinLength] = useState(
    settings.attendancePinLength,
  );
  const [notificationLookaheadDays, setNotificationLookaheadDays] = useState(
    settings.notificationLookaheadDays,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await onSave({
        academyName,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        currency,
        timezone,
        attendanceWindowBeforeMinutes,
        attendanceWindowAfterMinutes,
        attendancePinLength,
        notificationLookaheadDays,
      });
      setMessage("Academy settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm outline-none focus:border-primary-900";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm text-neutral-700">Academy name</span>
          <input
            required
            value={academyName}
            onChange={(e) => setAcademyName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Contact email</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Contact phone</span>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm text-neutral-700">Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Currency</span>
          <Select
            value={currency}
            onChange={setCurrency}
            options={CURRENCY_OPTIONS}
            aria-label="Currency"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Timezone</span>
          <Select
            value={timezone}
            onChange={setTimezone}
            options={TIMEZONE_OPTIONS}
            aria-label="Timezone"
          />
        </label>
      </div>

      <div className="rounded-xl border border-secondary-300 bg-secondary-50 p-4">
        <h3 className="text-sm font-semibold text-neutral-800">Student portal</h3>
        <p className="mt-1 text-xs text-neutral-600">
          Attendance PIN rules and notification look-ahead for the student app.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-700">
              Attendance window (minutes before session)
            </span>
            <input
              type="number"
              min={0}
              max={480}
              value={attendanceWindowBeforeMinutes}
              onChange={(e) =>
                setAttendanceWindowBeforeMinutes(Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-700">
              Attendance window (minutes after session start)
            </span>
            <input
              type="number"
              min={0}
              max={480}
              value={attendanceWindowAfterMinutes}
              onChange={(e) =>
                setAttendanceWindowAfterMinutes(Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-700">PIN length (digits)</span>
            <input
              type="number"
              min={4}
              max={8}
              value={attendancePinLength}
              onChange={(e) => setAttendancePinLength(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-neutral-700">
              Notification look-ahead (days)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={notificationLookaheadDays}
              onChange={(e) =>
                setNotificationLookaheadDays(Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {message ? (
        <p
          className={
            message.includes("saved")
              ? "text-sm text-neutral-700"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      ) : null}
      <SubmitButton loading={isSaving} loadingText="Saving…">
        Save Academy Settings
      </SubmitButton>

      <SessionSmsTemplatesSection
        templates={sessionSmsTemplates}
        onCreate={onCreateSmsTemplate}
        onUpdate={onUpdateSmsTemplate}
        onDelete={onDeleteSmsTemplate}
      />
    </form>
  );
}
