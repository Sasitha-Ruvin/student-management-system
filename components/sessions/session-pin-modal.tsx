"use client";

import { useEffect, useState } from "react";

import { SessionPinField } from "@/components/sessions/session-pin-field";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateSession } from "@/lib/api/batches";
import { generateSessionPin } from "@/lib/sessions/generate-session-pin";

type SessionPinModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  sessionId: string;
  sessionNumber: number;
  currentPin: string | null;
};

export function SessionPinModal({
  open,
  onClose,
  onSuccess,
  batchId,
  sessionId,
  sessionNumber,
  currentPin,
}: SessionPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPin(currentPin ?? generateSessionPin());
    setError(null);
  }, [open, currentPin]);

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits — use Generate PIN or enter 4 digits");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updateSession(batchId, sessionId, { action: "set-pin", pin });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set PIN");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClear() {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateSession(batchId, sessionId, { action: "clear-pin" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear PIN");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Session #${sessionNumber} PIN`} size="md">
      <form onSubmit={(e) => void handleSet(e)} className="space-y-4">
        <SessionPinField value={pin} onChange={setPin} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {currentPin ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleClear()}
              className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
            >
              Clear PIN
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <SubmitButton loading={isSubmitting}>Save PIN</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
