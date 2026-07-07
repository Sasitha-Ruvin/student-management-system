export type InvoicePdfUploadStatus = "PENDING" | "READY" | "FAILED";

export function normalizeInvoicePdfUploadStatus(
  value: string | null | undefined,
): InvoicePdfUploadStatus {
  if (value === "READY" || value === "FAILED") return value;
  return "PENDING";
}
