"use client";

import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  downloadInvoicePdf,
  fetchInvoicePdfBlob,
  fetchInvoiceSendContext,
  sendInvoiceToStudent,
} from "@/lib/api/payments";
import { formatMoney } from "@/lib/format/money";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import type { InvoiceSendContext } from "@/types/api/payment";

type InvoiceSendModalProps = {
  open: boolean;
  paymentId: string;
  onClose: () => void;
  onSent?: (message: string) => void;
};

export function InvoiceSendModal({
  open,
  paymentId,
  onClose,
  onSent,
}: InvoiceSendModalProps) {
  const [context, setContext] = useState<InvoiceSendContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setLoadingContext(true);
    setError(null);
    try {
      const data = await fetchInvoiceSendContext(paymentId);
      setContext(data);
      setSendEmail(data.emailConfigured);
      setSendSms(false);
      setPreviewKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load receipt");
      setContext(null);
    } finally {
      setLoadingContext(false);
    }
  }, [paymentId]);

  useEffect(() => {
    if (open) {
      void loadContext();
    }
  }, [open, loadContext]);

  useEffect(() => {
    if (!open || !context) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blob = await fetchInvoicePdfBlob(paymentId);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setPreviewError(
            e instanceof Error ? e.message : "Failed to load PDF preview",
          );
          setPreviewUrl(null);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [open, context, paymentId, previewKey]);

  async function handleDownload() {
    if (!context) return;
    setDownloading(true);
    setError(null);
    try {
      const filename = `${context.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      await downloadInvoicePdf(paymentId, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSend() {
    if (!context) return;
    if (!sendEmail && !sendSms) {
      setError("Choose email and/or SMS delivery");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await sendInvoiceToStudent(paymentId, {
        sendEmail,
        sendSms,
        emailRecipients: ["student"],
      });

      const parts: string[] = [];
      if (sendEmail) {
        parts.push(
          result.emailSent
            ? `Receipt emailed to ${context.studentEmail}.`
            : `Email failed: ${result.emailWarning ?? "unknown error"}.`,
        );
      }
      if (sendSms) {
        parts.push(
          result.smsSent
            ? `Receipt sent by SMS to ${context.smsPhone}.`
            : `SMS failed: ${result.smsWarning ?? "unknown error"}.`,
        );
      }

      onSent?.(parts.join(" "));
      if (
        (sendEmail && result.emailSent) ||
        (sendSms && result.smsSent)
      ) {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send receipt");
    } finally {
      setSending(false);
    }
  }

  const smsPhoneValid = context
    ? context.smsPhoneValid && Boolean(normalizeSriLankaMobile(context.smsPhone))
    : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={context ? `Receipt · ${context.invoiceNumber}` : "Receipt"}
      size="2xl"
    >
      {loadingContext ? (
        <p className="text-sm text-neutral-600">Loading receipt…</p>
      ) : context ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary-900">
                {context.studentName}
              </p>
              <p className="text-sm text-neutral-600">
                {formatMoney(context.amount, context.currency)} ·{" "}
                {new Date(context.paymentDate).toLocaleDateString("en-LK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
            >
              {downloading ? "Downloading…" : "Download PDF"}
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-secondary-300/60 bg-secondary-100/30">
            {previewLoading ? (
              <div className="flex h-[min(60vh,520px)] items-center justify-center bg-white text-sm text-neutral-600">
                Loading preview…
              </div>
            ) : previewError ? (
              <div className="flex h-[min(60vh,520px)] flex-col items-center justify-center gap-2 bg-white px-4 text-center text-sm text-destructive">
                <p>{previewError}</p>
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-neutral-700"
                >
                  Retry preview
                </button>
              </div>
            ) : previewUrl ? (
              <iframe
                key={previewKey}
                title={`Invoice preview ${context.invoiceNumber}`}
                src={previewUrl}
                className="h-[min(60vh,520px)] w-full bg-white"
              />
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-secondary-300/50 bg-secondary-100/20 p-4">
            <p className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Send to student
            </p>

            <label
              className={`flex items-start gap-2 ${context.emailConfigured ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              <input
                type="checkbox"
                checked={sendEmail}
                disabled={!context.emailConfigured}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-1 size-4 rounded border-secondary-400"
              />
              <span className="text-sm text-neutral-700">
                {context.emailConfigured ? (
                  <>
                    Email PDF receipt to{" "}
                    <span className="font-medium">{context.studentEmail}</span>
                  </>
                ) : (
                  <>Email — SMTP is not configured in server settings</>
                )}
              </span>
            </label>

            <label
              className={`flex items-start gap-2 ${context.smsConfigured && smsPhoneValid ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              <input
                type="checkbox"
                checked={sendSms}
                disabled={!context.smsConfigured || !smsPhoneValid}
                onChange={(e) => setSendSms(e.target.checked)}
                className="mt-1 size-4 rounded border-secondary-400"
              />
              <span className="text-sm text-neutral-700">
                {!context.smsConfigured ? (
                  <>SMS — Text.lk is not configured</>
                ) : smsPhoneValid ? (
                  <>
                    Send receipt by SMS to{" "}
                    <span className="font-medium">{context.smsPhone}</span>
                    {sendEmail ? (
                      <> — includes receipt summary; PDF attached via email</>
                    ) : (
                      <> — includes a download link for the PDF</>
                    )}
                  </>
                ) : (
                  <>
                    SMS — add a valid contact or WhatsApp number on the student
                    profile first
                  </>
                )}
              </span>
            </label>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
            >
              Close
            </button>
            <SubmitButton
              type="button"
              loading={sending}
              loadingText="Sending…"
              disabled={!sendEmail && !sendSms}
              onClick={() => void handleSend()}
            >
              Send receipt
            </SubmitButton>
          </div>
        </div>
      ) : (
        <p className="text-sm text-destructive">
          {error ?? "Could not load receipt details."}
        </p>
      )}
    </Modal>
  );
}
