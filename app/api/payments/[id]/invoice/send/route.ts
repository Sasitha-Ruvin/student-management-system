import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { sendPaymentReceipt } from "@/lib/email/send-payment-receipt";
import { buildInvoicePayload } from "@/lib/pdf/build-invoice-payload";
import { serveInvoicePdf } from "@/lib/pdf/serve-invoice-pdf";
import { sendInvoiceSms } from "@/lib/payments/send-invoice-sms";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import type { SendInvoiceRequest } from "@/types/api/payment";

type RouteContext = { params: Promise<{ id: string }> };

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

/**
 * POST /api/payments/[id]/invoice/send
 *
 * Sends receipt PDF by email and/or SMS summary with optional PDF download link.
 */
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;

  let body: SendInvoiceRequest = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const sendEmail = body.sendEmail === true;
  const sendSms = body.sendSms === true;

  if (!sendEmail && !sendSms) {
    return NextResponse.json(
      { error: "Choose email and/or SMS delivery" },
      { status: 400 },
    );
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      voidedAt: true,
      paymentDate: true,
      amount: true,
      invoice: { select: { id: true, invoiceNumber: true } },
      student: { select: STUDENT_PII_SELECT },
    },
  });

  if (!payment?.invoice || payment.voidedAt) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const invoiceData = await buildInvoicePayload(paymentId);
  if (!invoiceData) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  let pdfResult;
  try {
    pdfResult = await serveInvoicePdf(paymentId);
    if (!pdfResult) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
  } catch (err) {
    if (err instanceof Error && err.message === "VOIDED") {
      return NextResponse.json(
        { error: "This payment has been voided. Invoice is no longer available." },
        { status: 410 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to prepare invoice PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const recipients: Array<"student" | "admin"> =
    Array.isArray(body.emailRecipients) && body.emailRecipients.length > 0
      ? body.emailRecipients.filter(
          (r): r is "student" | "admin" => r === "student" || r === "admin",
        )
      : ["student"];

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one email recipient" },
      { status: 400 },
    );
  }

  let emailSent = false;
  let emailWarning: string | undefined;
  let smsSent = false;
  let smsWarning: string | undefined;

  if (sendEmail) {
    try {
      await sendPaymentReceipt({
        invoiceData,
        studentEmail: invoiceData.studentEmail,
        recipients,
        pdfBuffer: pdfResult.pdfBuffer,
      });
      emailSent = true;
    } catch (err) {
      emailWarning =
        err instanceof Error ? err.message : "Failed to send receipt email";
    }
  }

  if (sendSms) {
    const studentPii = decryptStudentPii(payment.student);
    const settings = await prisma.academySettings.findUnique({
      where: { id: "default" },
      select: { contactPhone: true },
    });

    const smsResult = await sendInvoiceSms({
      invoiceId: payment.invoice.id,
      contactNumber: studentPii.contactNumber,
      whatsappNumber: studentPii.whatsappNumber,
      studentName: payment.student.fullName,
      studentEmail: payment.student.email,
      invoiceNumber: payment.invoice.invoiceNumber,
      amountLabel: formatAmount(Number(payment.amount), invoiceData.currency),
      paymentDateLabel: formatPaymentDate(payment.paymentDate.toISOString()),
      academyContactPhone: settings?.contactPhone ?? null,
      emailedPdf: emailSent && recipients.includes("student"),
      request,
    });
    smsSent = smsResult.smsSent;
    smsWarning = smsResult.smsWarning;
  }

  if ((sendEmail && !emailSent) && (sendSms && !smsSent)) {
    return NextResponse.json(
      {
        error: [emailWarning, smsWarning].filter(Boolean).join(" · "),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      emailSent,
      smsSent,
      ...(emailWarning ? { emailWarning } : {}),
      ...(smsWarning ? { smsWarning } : {}),
    },
  });
}
