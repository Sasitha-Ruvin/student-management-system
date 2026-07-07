import { NextResponse } from "next/server";

import { verifyInvoiceDownloadToken } from "@/lib/invoices/invoice-download-token";
import { serveInvoicePdf } from "@/lib/pdf/serve-invoice-pdf";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/invoices/download?token=...
 *
 * Public invoice PDF download for SMS/email links. Auth is the signed token only.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Invalid or expired download link" },
      { status: 400 },
    );
  }

  const verified = verifyInvoiceDownloadToken(token);
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or expired download link" },
      { status: 403 },
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: verified.invoiceId },
    select: {
      paymentId: true,
      invoiceNumber: true,
      payment: { select: { voidedAt: true } },
    },
  });

  if (!invoice || invoice.payment.voidedAt) {
    return NextResponse.json(
      { error: "Invoice not available" },
      { status: 404 },
    );
  }

  try {
    const result = await serveInvoicePdf(invoice.paymentId);
    if (!result) {
      return NextResponse.json(
        { error: "Invoice not available" },
        { status: 404 },
      );
    }

    const filename = `${result.meta.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "VOIDED") {
      return NextResponse.json(
        { error: "Invoice not available" },
        { status: 410 },
      );
    }

    console.error("[invoice-download] public serve failed:", err);
    return NextResponse.json(
      { error: "Could not load invoice PDF" },
      { status: 500 },
    );
  }
}
