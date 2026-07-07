import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { createEmailTransporter } from "@/lib/email/create-transporter";
import { buildInvoicePayload } from "@/lib/pdf/build-invoice-payload";
import { isTextLkConfigured } from "@/lib/sms/textlk-client";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/payments/[id]/invoice/context — student contact + delivery options for send UI */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      voidedAt: true,
      amount: true,
      paymentDate: true,
      invoice: { select: { invoiceNumber: true } },
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

  const studentPii = decryptStudentPii(payment.student);
  const smsPhone = resolveStudentPhone(
    studentPii.contactNumber,
    studentPii.whatsappNumber,
  );
  const smsPhoneValid = Boolean(normalizeSriLankaMobile(smsPhone));

  let emailConfigured = false;
  try {
    await createEmailTransporter();
    emailConfigured = true;
  } catch {
    emailConfigured = false;
  }

  return NextResponse.json({
    data: {
      paymentId,
      invoiceNumber: payment.invoice.invoiceNumber,
      studentName: payment.student.fullName,
      studentEmail: payment.student.email,
      smsPhone,
      smsPhoneValid,
      amount: Number(payment.amount),
      currency: invoiceData.currency,
      paymentDate: payment.paymentDate.toISOString(),
      emailConfigured,
      smsConfigured: isTextLkConfigured(),
    },
  });
}
