import { createEmailTransporter } from "@/lib/email/create-transporter";
import { sendPaymentReceipt } from "@/lib/email/send-payment-receipt";
import { buildInvoicePayload } from "@/lib/pdf/build-invoice-payload";
import { serveInvoicePdf } from "@/lib/pdf/serve-invoice-pdf";
import { sendInvoiceSms } from "@/lib/payments/send-invoice-sms";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import { isTextLkConfigured } from "@/lib/sms/textlk-client";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

export type ReceiptDeliveryContext = {
  studentEmail: string;
  smsPhone: string;
  smsPhoneValid: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
};

export async function getReceiptDeliveryContext(
  studentId: string,
): Promise<ReceiptDeliveryContext | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: STUDENT_PII_SELECT,
  });
  if (!student) return null;

  const studentPii = decryptStudentPii(student);
  const smsPhone = resolveStudentPhone(
    studentPii.contactNumber,
    studentPii.whatsappNumber,
  );

  let emailConfigured = false;
  try {
    await createEmailTransporter();
    emailConfigured = true;
  } catch {
    emailConfigured = false;
  }

  return {
    studentEmail: student.email,
    smsPhone,
    smsPhoneValid: Boolean(normalizeSriLankaMobile(smsPhone)),
    emailConfigured,
    smsConfigured: isTextLkConfigured(),
  };
}

function formatPaymentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

/** Generates PDFs and sends receipt email/SMS for recorded payment(s). */
export async function notifyPaymentReceipts(opts: {
  paymentIds: string[];
  sendEmail: boolean;
  sendSms: boolean;
}): Promise<string[]> {
  const warnings: string[] = [];
  if (!opts.sendEmail && !opts.sendSms) return warnings;

  for (const paymentId of opts.paymentIds) {
    let pdfResult;
    try {
      pdfResult = await serveInvoicePdf(paymentId);
    } catch (err) {
      if (err instanceof Error && err.message === "VOIDED") continue;
      warnings.push(
        `Receipt PDF for payment ${paymentId}: ${
          err instanceof Error ? err.message : "generation failed"
        }`,
      );
      continue;
    }
    if (!pdfResult) continue;

    const invoiceData = await buildInvoicePayload(paymentId);
    if (!invoiceData) continue;

    const invoiceNumber = pdfResult.meta.invoiceNumber;
    let emailSent = false;

    if (opts.sendEmail) {
      try {
        await sendPaymentReceipt({
          invoiceData,
          studentEmail: invoiceData.studentEmail,
          recipients: ["student", "admin"],
          pdfBuffer: pdfResult.pdfBuffer,
        });
        emailSent = true;
      } catch (err) {
        warnings.push(
          `${invoiceNumber} email: ${
            err instanceof Error ? err.message : "send failed"
          }`,
        );
      }
    }

    if (opts.sendSms) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: {
          amount: true,
          paymentDate: true,
          student: { select: STUDENT_PII_SELECT },
        },
      });
      if (!payment) continue;

      const studentPii = decryptStudentPii(payment.student);
      const settings = await prisma.academySettings.findUnique({
        where: { id: "default" },
        select: { contactPhone: true },
      });

      const smsResult = await sendInvoiceSms({
        invoiceId: pdfResult.meta.invoiceId,
        contactNumber: studentPii.contactNumber,
        whatsappNumber: studentPii.whatsappNumber,
        studentName: payment.student.fullName,
        studentEmail: payment.student.email,
        invoiceNumber,
        amountLabel: formatAmount(Number(payment.amount), invoiceData.currency),
        paymentDateLabel: formatPaymentDate(payment.paymentDate.toISOString()),
        academyContactPhone: settings?.contactPhone ?? null,
        emailedPdf: emailSent,
      });

      if (!smsResult.smsSent && smsResult.smsWarning) {
        warnings.push(`${invoiceNumber} SMS: ${smsResult.smsWarning}`);
      }
    }
  }

  return warnings;
}
