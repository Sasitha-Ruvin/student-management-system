import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { serveInvoicePdf } from "@/lib/pdf/serve-invoice-pdf";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/payments/[id]/invoice — serve PDF (attachment or inline preview) */
export async function GET(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  try {
    const result = await serveInvoicePdf(paymentId);
    if (!result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const filename = `${result.meta.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    const disposition = inline
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Invoice-Pdf-Status": result.meta.uploadStatus,
        "X-Invoice-Pdf-Cached": result.servedFromCache ? "1" : "0",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "VOIDED") {
      return NextResponse.json(
        { error: "This payment has been voided. Invoice is no longer available." },
        { status: 410 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to generate invoice PDF";
    console.error("[invoice] PDF serve failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
