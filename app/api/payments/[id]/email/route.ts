import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { sendPaymentReceipt } from "@/lib/email/send-payment-receipt";
import { buildInvoicePayload } from "@/lib/pdf/build-invoice-payload";
import { getPaymentById } from "@/lib/payments/payment-queries";
import type { SendPaymentEmailRequest } from "@/types/api/payment";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/[id]/email
 *
 * (Re-)sends the payment receipt email for an existing payment.
 * Body: { recipients?: ["student" | "admin"] }  — defaults to both.
 *
 * Useful for resending after recording, or for manual WhatsApp download
 * triggered from the admin UI.
 */
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;

  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  let body: SendPaymentEmailRequest = {};
  try {
    body = await request.json();
  } catch {
    // body is optional — default to both recipients
  }

  const recipients: Array<"student" | "admin"> =
    Array.isArray(body.recipients) && body.recipients.length > 0
      ? body.recipients
      : ["student", "admin"];

  const invoiceData = await buildInvoicePayload(paymentId);
  if (!invoiceData) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  try {
    await sendPaymentReceipt({
      studentEmail: invoiceData.studentEmail,
      recipients,
      invoiceData,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ data: { sent: true, recipients } });
}
