import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { serveInvoicePdf } from "@/lib/pdf/serve-invoice-pdf";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/payments/[id]/invoice/retry — Re-upload cached or regenerated PDF */
export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;

  try {
    const result = await serveInvoicePdf(paymentId, { forceRegenerate: false });
    if (!result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        uploadStatus: result.meta.uploadStatus,
        pdfUrl: result.meta.pdfUrl,
        uploadError: result.meta.uploadError,
        message:
          result.meta.uploadStatus === "READY"
            ? "Invoice PDF uploaded successfully"
            : "Invoice PDF upload failed",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "VOIDED") {
      return NextResponse.json(
        { error: "This payment has been voided. Invoice is no longer available." },
        { status: 410 },
      );
    }
    const message = err instanceof Error ? err.message : "Retry failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
