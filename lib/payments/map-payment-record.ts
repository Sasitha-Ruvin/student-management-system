import { invoicePdfProxyUrl } from "@/lib/storage/proxy-urls";
import {
  decryptPaymentSensitive,
  PAYMENT_SENSITIVE_SELECT,
  type PaymentSensitiveDbRow,
} from "@/lib/payments/payment-sensitive";
import type { PaymentHistoryItem, PaymentRecord } from "@/types/api/payment";

export { PAYMENT_SENSITIVE_SELECT };

type PaymentRowBase = PaymentSensitiveDbRow & {
  id: string;
  studentId: string;
  installmentId: string | null;
  amount: unknown;
  paymentDate: Date;
  method: string;
  voidedAt?: Date | null;
  createdAt: Date;
  installment?: { label: string } | null;
  invoice?: { id?: string; invoiceNumber: string; pdfUrl: string | null } | null;
  recordedBy: { name: string };
};

export function mapPaymentHistoryItem(row: PaymentRowBase): PaymentHistoryItem {
  const sensitive = decryptPaymentSensitive(row);
  return {
    paymentId: row.id,
    invoiceNumber: row.invoice?.invoiceNumber ?? "",
    installmentLabel: row.installment?.label ?? null,
    amount: Number(row.amount),
    paymentDate: row.paymentDate.toISOString(),
    method: row.method as PaymentHistoryItem["method"],
    reference: sensitive.reference,
    notes: sensitive.notes,
    recordedByName: row.recordedBy.name,
    pdfUrl: invoicePdfProxyUrl(row.id, row.invoice?.pdfUrl),
    createdAt: row.createdAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: sensitive.voidReason,
  };
}

export function mapPaymentRecord(
  row: PaymentRowBase & { invoice: { id: string; invoiceNumber: string; pdfUrl: string | null } },
): PaymentRecord {
  const sensitive = decryptPaymentSensitive(row);
  return {
    paymentId: row.id,
    invoiceId: row.invoice.id,
    invoiceNumber: row.invoice.invoiceNumber,
    studentId: row.studentId,
    installmentId: row.installmentId,
    installmentLabel: row.installment?.label ?? null,
    amount: Number(row.amount),
    paymentDate: row.paymentDate.toISOString(),
    method: row.method as PaymentRecord["method"],
    reference: sensitive.reference,
    notes: sensitive.notes,
    recordedByName: row.recordedBy.name,
    pdfUrl: invoicePdfProxyUrl(row.id, row.invoice.pdfUrl),
    createdAt: row.createdAt.toISOString(),
  };
}
