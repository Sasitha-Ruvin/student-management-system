"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { InvoiceSendModal } from "@/components/payments/invoice-send-modal";
import {
  fetchInvoicePdfStatus,
  retryInvoicePdfUpload,
} from "@/lib/api/payments";
import type { InvoicePdfDisplayStatus } from "@/types/api/payment";

type InvoiceDownloadButtonProps = {
  paymentId: string;
  invoiceNumber?: string;
  className?: string;
  label?: string;
};

export function InvoiceDownloadButton({
  paymentId,
  invoiceNumber: _invoiceNumber,
  className = "rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-primary-900 hover:bg-secondary-100/60 disabled:opacity-50",
  label = "Receipt",
}: InvoiceDownloadButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [displayStatus, setDisplayStatus] =
    useState<InvoicePdfDisplayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warmedRef = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await fetchInvoicePdfStatus(paymentId);
      setDisplayStatus(status.displayStatus);
      if (status.uploadError && status.displayStatus === "failed") {
        setError(status.uploadError);
      } else {
        setError(null);
      }
      return status;
    } catch {
      setDisplayStatus("ready");
      return null;
    }
  }, [paymentId]);

  useEffect(() => {
    warmedRef.current = false;
  }, [paymentId]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function warmCacheIfNeeded() {
      const status = await refreshStatus();
      if (cancelled || !status || status.displayStatus !== "generating") {
        return;
      }
      if (warmedRef.current) return;

      warmedRef.current = true;
      setWarming(true);
      try {
        await retryInvoicePdfUpload(paymentId);
      } catch {
        // Preview/download still works on demand.
      } finally {
        if (!cancelled) setWarming(false);
      }

      await refreshStatus();

      let attempts = 0;
      pollTimer = setInterval(() => {
        void (async () => {
          if (cancelled || attempts++ > 10) {
            if (pollTimer) clearInterval(pollTimer);
            return;
          }
          const next = await refreshStatus();
          if (
            !next ||
            next.displayStatus === "ready" ||
            next.displayStatus === "failed"
          ) {
            if (pollTimer) clearInterval(pollTimer);
          }
        })();
      }, 2000);
    }

    void warmCacheIfNeeded();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [paymentId, refreshStatus]);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    warmedRef.current = true;
    try {
      const result = await retryInvoicePdfUpload(paymentId);
      if (result.uploadStatus !== "READY") {
        setError("Upload failed — open receipt to preview or retry");
        setDisplayStatus("failed");
      } else {
        await refreshStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
      setDisplayStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  const isFailed = displayStatus === "failed";
  let buttonLabel = label;
  if (loading) {
    buttonLabel = isFailed ? "Retrying…" : "Preparing…";
  } else if (isFailed) {
    buttonLabel = "Retry upload";
  }

  function handleClick() {
    if (isFailed && !loading) {
      void handleRetry();
      return;
    }
    setModalOpen(true);
  }

  return (
    <>
      <span className="inline-flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={className}
        >
          {buttonLabel}
        </button>
        {error ? (
          <span className="max-w-[200px] text-right text-[10px] text-destructive">
            {error}
          </span>
        ) : warming && !loading ? (
          <span className="text-[10px] text-neutral-500">Preparing receipt…</span>
        ) : null}
      </span>

      <InvoiceSendModal
        open={modalOpen}
        paymentId={paymentId}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
