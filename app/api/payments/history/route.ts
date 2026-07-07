import { NextResponse } from "next/server";

import { freshAdminJson } from "@/lib/api/cache-headers";
import { requireAdmin } from "@/lib/api/require-admin";
import { getPaymentsByBatch } from "@/lib/payments/payment-history-queries";

/**
 * GET /api/payments/history?batchId=...&page=1&limit=20
 *
 * Paginated payment history for all students in a batch.
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  if (!batchId) {
    return NextResponse.json(
      { error: "batchId is required" },
      { status: 400 },
    );
  }

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );

  const data = await getPaymentsByBatch(batchId, page, limit);

  return freshAdminJson({ data });
}
