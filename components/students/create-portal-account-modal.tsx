"use client";

import { useEffect, useState } from "react";

import { PortalPasswordField } from "@/components/students/portal-password-field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  generatePortalPassword,
  validatePortalPassword,
} from "@/lib/auth/portal-password";
import { createPortalAccount } from "@/lib/api/students";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

type CreatePortalAccountModalProps = {
  open: boolean;
  studentId: string;
  studentName: string;
  email: string;
  contactNumber: string;
  whatsappNumber: string;
  onClose: () => void;
  onSuccess: (message?: string) => void;
};

export function CreatePortalAccountModal({
  open,
  studentId,
  studentName,
  email,
  contactNumber,
  whatsappNumber,
  onClose,
  onSuccess,
}: CreatePortalAccountModalProps) {
  const [password, setPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const smsPhone = resolveStudentPhone(contactNumber, whatsappNumber);
  const smsPhoneValid = Boolean(normalizeSriLankaMobile(smsPhone));

  useEffect(() => {
    if (open) {
      setPassword(generatePortalPassword());
      setSendEmail(true);
      setSendSms(false);
      setError(null);
    }
  }, [open]);

  async function handleCreate() {
    const validationError = validatePortalPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createPortalAccount(studentId, {
        temporaryPassword: password,
        sendEmail,
        sendSms,
      });
      let message = `Portal account created for ${studentName}.`;
      if (sendEmail) {
        message += result.emailSent
          ? " Login details were emailed to the student."
          : ` Email could not be sent: ${result.emailWarning ?? "unknown error"}. Share the password above manually.`;
      }
      if (sendSms) {
        message += result.smsSent
          ? " Login details were sent by SMS."
          : ` SMS could not be sent: ${result.smsWarning ?? "unknown error"}. Share the password above manually.`;
      }
      if (!sendEmail && !sendSms) {
        message += " Share the password above with the student.";
      }
      onSuccess(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create portal account" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          A random password is generated below. The student signs in with their email and
          this password. Use Generate to create a new one, or copy it if email delivery
          fails.
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Email
          </span>
          <input
            type="email"
            value={email}
            readOnly
            className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-secondary-100/50 px-3 text-sm text-neutral-700"
          />
        </label>

        <PortalPasswordField
          value={password}
          onChange={setPassword}
          label="Login password"
        />

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="mt-1 size-4 rounded border-secondary-400"
          />
          <span className="text-sm text-neutral-700">
            Email login details to the student ({email})
          </span>
        </label>

        <label
          className={`flex items-start gap-2 ${smsPhoneValid ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
        >
          <input
            type="checkbox"
            checked={sendSms}
            disabled={!smsPhoneValid}
            onChange={(e) => setSendSms(e.target.checked)}
            className="mt-1 size-4 rounded border-secondary-400"
          />
          <span className="text-sm text-neutral-700">
            {smsPhoneValid ? (
              <>
                Send login details by SMS ({smsPhone}) — email, password, and
                portal link
              </>
            ) : (
              <>
                Send login details by SMS — add a valid contact or WhatsApp
                number on the student profile first
              </>
            )}
          </span>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Skip for now
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Creating…"
            onClick={() => void handleCreate()}
          >
            Create &amp; send login
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
