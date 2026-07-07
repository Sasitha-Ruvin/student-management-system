/**
 * Sends a payment receipt email with a PDF invoice attachment.
 *
 * Requires nodemailer to be installed:
 *   yarn add nodemailer
 *   yarn add -D @types/nodemailer
 *
 * Required environment variables (add to .env):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=doclink308@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM="Walk Model Agency <doclink308@gmail.com>"
 */

import {
  createEmailTransporter,
  getEmailFromAddress,
} from "@/lib/email/create-transporter";
import { generateInvoicePdf, type InvoiceData } from "@/lib/pdf/generate-invoice";

const ADMIN_EMAIL = "doclink308@gmail.com";

export type SendReceiptOptions = {
  invoiceData: InvoiceData;
  studentEmail: string;
  recipients: Array<"student" | "admin">;
  /** Reuse an already-generated PDF when available. */
  pdfBuffer?: Buffer;
};

/**
 * Generates the PDF and sends it to the requested recipients.
 * Throws if SMTP is not configured or send fails.
 */
export async function sendPaymentReceipt(opts: SendReceiptOptions): Promise<void> {
  const { invoiceData, studentEmail, recipients } = opts;

  const pdfBuffer =
    opts.pdfBuffer ?? (await generateInvoicePdf(invoiceData));
  const transporter = await createEmailTransporter();
  const from = getEmailFromAddress();

  const to: string[] = [];
  if (recipients.includes("student") && studentEmail) {
    to.push(studentEmail);
  }
  if (recipients.includes("admin")) {
    to.push(ADMIN_EMAIL);
  }

  if (to.length === 0) return;

  const subject = `Payment Receipt — ${invoiceData.invoiceNumber}`;
  const html = buildEmailHtml(invoiceData);

  await transporter.sendMail({
    from,
    to: to.join(", "),
    subject,
    html,
    attachments: [
      {
        filename: `${invoiceData.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

function buildEmailHtml(data: InvoiceData): string {
  const lines =
    data.lines?.length > 0
      ? data.lines
      : [{ description: data.lineDescription, amount: data.amount }];

  const breakdownRows = lines
    .map(
      (line) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">${line.description}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">${data.currency} ${line.amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</td>
    </tr>`,
    )
    .join("");

  const formattedAmount = `${data.currency} ${data.amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
  })}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a1a;">${data.academyName}</h2>
  <p>Dear ${data.studentName},</p>
  <p>We have recorded your payment. Please find your receipt attached.</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Invoice Number</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.invoiceNumber}</td>
    </tr>
    ${data.installmentLabel ? `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Instalment</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.installmentLabel}</td>
    </tr>` : ""}
    ${breakdownRows}
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Total paid</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;text-align:right;">${formattedAmount}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Payment Date</td>
      <td style="padding:8px;border:1px solid #ddd;">${new Date(data.paymentDate).toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Method</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.method.replace("_", " ")}</td>
    </tr>
    ${data.reference ? `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Reference</td>
      <td style="padding:8px;border:1px solid #ddd;">${data.reference}</td>
    </tr>` : ""}
  </table>
  <p style="color:#666;font-size:13px;">The PDF receipt is attached to this email. You may also forward it via WhatsApp for your records.</p>
  <p style="color:#666;font-size:13px;">Thank you,<br/>${data.academyName}</p>
</body>
</html>`.trim();
}
