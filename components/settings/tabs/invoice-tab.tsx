"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import type { AcademySettingsDto } from "@/types/api/settings";

type InvoiceTabProps = {
  settings: AcademySettingsDto;
  onSave: (data: Partial<AcademySettingsDto>) => Promise<void>;
};

export function InvoiceTab({ settings, onSave }: InvoiceTabProps) {
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState(
    settings.invoiceNumberPrefix,
  );
  const [invoicePaymentMethodLabel, setInvoicePaymentMethodLabel] = useState(
    settings.invoicePaymentMethodLabel ?? "Bank Transfer",
  );
  const [invoiceBankName, setInvoiceBankName] = useState(
    settings.invoiceBankName ?? "",
  );
  const [invoiceBankAccountNumber, setInvoiceBankAccountNumber] = useState(
    settings.invoiceBankAccountNumber ?? "",
  );
  const [invoiceBankAccountName, setInvoiceBankAccountName] = useState(
    settings.invoiceBankAccountName ?? "",
  );
  const [invoiceBankBranch, setInvoiceBankBranch] = useState(
    settings.invoiceBankBranch ?? "",
  );
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoiceFooter ?? "");
  const [invoiceTerms, setInvoiceTerms] = useState(
    settings.invoiceTerms ??
      "Kindly note that all payments made are non-refundable.",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm outline-none focus:border-primary-900";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await onSave({
        invoiceNumberPrefix,
        invoicePaymentMethodLabel: invoicePaymentMethodLabel || null,
        invoiceBankName: invoiceBankName || null,
        invoiceBankAccountNumber: invoiceBankAccountNumber || null,
        invoiceBankAccountName: invoiceBankAccountName || null,
        invoiceBankBranch: invoiceBankBranch || null,
        invoiceFooter: invoiceFooter || null,
        invoiceTerms: invoiceTerms || null,
      });
      setMessage("Invoice template saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-neutral-600">
        Bank details and terms appear on generated PDF invoices. Upload your logo
        under Branding.
      </p>

      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-700">Invoice number prefix</span>
        <input
          required
          value={invoiceNumberPrefix}
          onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
          className={inputClass}
          placeholder="INV"
        />
      </label>

      <fieldset className="space-y-4 rounded-xl border border-secondary-300/60 p-4">
        <legend className="px-1 text-sm font-medium text-primary-900">
          Bank details (shown on invoice)
        </legend>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Payment method label</span>
          <input
            value={invoicePaymentMethodLabel}
            onChange={(e) => setInvoicePaymentMethodLabel(e.target.value)}
            className={inputClass}
            placeholder="Bank Transfer"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Bank name</span>
          <input
            value={invoiceBankName}
            onChange={(e) => setInvoiceBankName(e.target.value)}
            className={inputClass}
            placeholder="Commercial Bank"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Account number</span>
          <input
            value={invoiceBankAccountNumber}
            onChange={(e) => setInvoiceBankAccountNumber(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Account name</span>
          <input
            value={invoiceBankAccountName}
            onChange={(e) => setInvoiceBankAccountName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Branch</span>
          <input
            value={invoiceBankBranch}
            onChange={(e) => setInvoiceBankBranch(e.target.value)}
            className={inputClass}
          />
        </label>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-700">Footer text</span>
        <textarea
          value={invoiceFooter}
          onChange={(e) => setInvoiceFooter(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="THANK YOU!"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-700">Disclaimer / terms</span>
        <textarea
          value={invoiceTerms}
          onChange={(e) => setInvoiceTerms(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>
      {message ? <p className="text-sm text-neutral-700">{message}</p> : null}
      <SubmitButton loading={isSaving} loadingText="Saving…">
        Save Invoice Template
      </SubmitButton>
    </form>
  );
}
