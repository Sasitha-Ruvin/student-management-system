import { buildInvoiceReceiptSmsBody } from "@/lib/sms/build-invoice-receipt-sms-body";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { isTextLkConfigured, sendTextLkSms } from "@/lib/sms/textlk-client";
import { createPublicInvoiceDownloadUrl } from "@/lib/invoices/public-invoice-download-url";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

export type SendInvoiceSmsInput = {
  invoiceId: string;
  contactNumber: string;
  whatsappNumber: string;
  studentName: string;
  studentEmail: string | null;
  invoiceNumber: string;
  amountLabel: string;
  paymentDateLabel: string;
  academyContactPhone: string | null;
  /** When true, SMS notes that the PDF was emailed instead of including a link. */
  emailedPdf: boolean;
  /** Used to build absolute download URLs when ADMIN_PORTAL_URL is unset. */
  request?: Request;
};

export async function sendInvoiceSms(
  input: SendInvoiceSmsInput,
): Promise<{ smsSent: boolean; smsWarning?: string }> {
  const rawPhone = resolveStudentPhone(input.contactNumber, input.whatsappNumber);
  const recipient = normalizeSriLankaMobile(rawPhone);
  if (!recipient) {
    return {
      smsSent: false,
      smsWarning: rawPhone
        ? `Invalid mobile number on file (${rawPhone})`
        : "No contact or WhatsApp number on the student profile",
    };
  }

  if (!isTextLkConfigured()) {
    return {
      smsSent: false,
      smsWarning:
        "Text.lk is not configured (TEXT_LK_API_TOKEN, TEXT_LK_SENDER_ID)",
    };
  }

  let pdfDownloadUrl: string | null = null;
  if (!input.emailedPdf) {
    try {
      pdfDownloadUrl = createPublicInvoiceDownloadUrl(input.invoiceId, input.request);
    } catch {
      return {
        smsSent: false,
        smsWarning:
          "Could not create a PDF download link. Set ADMIN_PORTAL_URL and try again.",
      };
    }
  }

  const firstName = input.studentName.split(" ")[0] ?? input.studentName;
  const body = buildInvoiceReceiptSmsBody({
    studentFirstName: firstName,
    invoiceNumber: input.invoiceNumber,
    amountLabel: input.amountLabel,
    paymentDateLabel: input.paymentDateLabel,
    studentEmail: input.studentEmail,
    pdfDownloadUrl,
    emailedPdf: input.emailedPdf,
    academyContactPhone: input.academyContactPhone,
  });

  try {
    await sendTextLkSms(recipient, body);
    return { smsSent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send SMS";
    return { smsSent: false, smsWarning: message };
  }
}
