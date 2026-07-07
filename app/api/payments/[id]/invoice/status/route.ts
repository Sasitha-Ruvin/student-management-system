import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { getInvoicePdfMeta } from "@/lib/pdf/serve-invoice-pdf";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/payments/[id]/invoice/status — PDF cache/upload state for UI */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: paymentId } = await context.params;
  const meta = await getInvoicePdfMeta(paymentId);

  if (!meta) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const displayStatus = meta.isStale
    ? "generating"
    : meta.uploadStatus === "READY"
      ? "ready"
      : meta.uploadStatus === "FAILED"
        ? "failed"
        : "generating";

  return NextResponse.json({
    data: {
      uploadStatus: meta.uploadStatus,
      displayStatus,
      pdfUrl: meta.pdfUrl,
      isStale: meta.isStale,
      uploadError: meta.uploadError,
    },
  });
}
