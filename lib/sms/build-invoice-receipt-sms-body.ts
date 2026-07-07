const MAX_SMS_LENGTH = 480;
const ACADEMY_HEADER = "The Walk Model Academy";

export type BuildInvoiceReceiptSmsBodyInput = {
  studentFirstName: string;
  invoiceNumber: string;
  amountLabel: string;
  paymentDateLabel: string;
  studentEmail: string | null;
  pdfDownloadUrl: string | null;
  emailedPdf: boolean;
  academyContactPhone: string | null;
};

function buildSuffix(contactPhone: string | null): string {
  return contactPhone ? `\n\nQuestions: ${contactPhone}` : "";
}

export function buildInvoiceReceiptSmsBody(
  input: BuildInvoiceReceiptSmsBodyInput,
): string {
  const suffix = buildSuffix(input.academyContactPhone);
  const lines = [
    ACADEMY_HEADER,
    `Hi ${input.studentFirstName},`,
    "",
    `Receipt ${input.invoiceNumber}: ${input.amountLabel} paid on ${input.paymentDateLabel}.`,
  ];

  if (input.emailedPdf && input.studentEmail) {
    lines.push(`PDF receipt emailed to ${input.studentEmail}.`);
  } else if (input.pdfDownloadUrl) {
    lines.push(`Download PDF: ${input.pdfDownloadUrl}`);
  } else {
    lines.push("Contact the academy for your PDF receipt.");
  }

  const core = lines.join("\n");
  const full = core + suffix;
  if (full.length <= MAX_SMS_LENGTH) {
    return full;
  }

  const reserved = suffix.length;
  const maxCore = Math.max(0, MAX_SMS_LENGTH - reserved);
  return core.slice(0, maxCore) + "…" + suffix;
}
