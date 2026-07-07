"use client";

import { useEffect, useState } from "react";

import { PortalPasswordField } from "@/components/students/portal-password-field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  generatePortalPassword,
  validatePortalPassword,
} from "@/lib/auth/portal-password";
import { setPortalPassword } from "@/lib/api/students";

type ChangePortalPasswordModalProps = {
  open: boolean;
  studentId: string;
  studentName: string;
  email: string;
  onClose: () => void;
  onSuccess: (message?: string) => void;
};

export function ChangePortalPasswordModal({
  open,
  studentId,
  studentName,
  email,
  onClose,
  onSuccess,
}: ChangePortalPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword(generatePortalPassword());
      setError(null);
    }
  }, [open]);

  async function handleUpdate() {
    const validationError = validatePortalPassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await setPortalPassword(studentId, {
        newPassword: password,
        sendEmail: false,
      });
      onSuccess(`Portal password updated for ${studentName}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change portal password" size="md">
      <div className="space-y-4">
        <p className="text-sm text-neutral-700">
          A random password is generated below. The student signs in with their email and
          this password. Use Generate to create a new one, then click Update password to
          apply it immediately.
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
          id="change-portal-password"
          label="Login password"
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Updating…"
            onClick={() => void handleUpdate()}
          >
            Update password
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
