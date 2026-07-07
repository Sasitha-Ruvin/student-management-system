import { createHash } from "crypto";

import type { InvoiceData } from "@/lib/pdf/generate-invoice";

/** Stable subset of invoice data used to detect when a cached PDF is stale. */
export function computeInvoiceContentHash(data: InvoiceData): string {
  const stable = {
    invoiceNumber: data.invoiceNumber,
    paymentDate: data.paymentDate,
    paymentType: data.paymentType,
    method: data.method,
    reference: data.reference,
    notes: data.notes,
    recordedByName: data.recordedByName,
    amount: data.amount,
    paidThisReceipt: data.paidThisReceipt,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    studentPhone: data.studentPhone,
    studentAddress: data.studentAddress,
    installmentLabel: data.installmentLabel,
    batchCode: data.batchCode,
    lineDescription: data.lineDescription,
    lines: data.lines,
    academyName: data.academyName,
    academyAddress: data.academyAddress,
    academyPhone: data.academyPhone,
    academyEmail: data.academyEmail,
    currency: data.currency,
    invoiceFooter: data.invoiceFooter,
    invoiceTerms: data.invoiceTerms,
    paymentMethodLabel: data.paymentMethodLabel,
    bankName: data.bankName,
    bankAccountNumber: data.bankAccountNumber,
    bankAccountName: data.bankAccountName,
    bankBranch: data.bankBranch,
  };

  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
