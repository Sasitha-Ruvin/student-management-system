import { NextResponse } from "next/server";

import { freshAdminJson } from "@/lib/api/cache-headers";
import { parsePageLimit } from "@/lib/api/parse-list-params";
import { requireAdmin } from "@/lib/api/require-admin";
import { getInstallmentsByBatch } from "@/lib/payments/payment-queries";
import { syncOverdueInstallments } from "@/lib/payments/sync-overdue-installments";

/**
 * GET /api/payments/installments
 *
 * Query params:
 *   batchId   (required)
 *   branchId  (optional)
 *   status    (optional) PENDING | PARTIAL | PAID | OVERDUE
 *   search    (optional) student name, NIC or model code
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  if (!batchId) {
    return NextResponse.json(
      { error: "batchId is required (use \"all\" for every batch)" },
      { status: 400 },
    );
  }

  const branchId = searchParams.get("branchId") || null;
  const status = searchParams.get("status") || null;
  const search = searchParams.get("search") || null;

  const validStatuses = ["PENDING", "PARTIAL", "PAID", "OVERDUE"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 },
    );
  }

  await syncOverdueInstallments();

  const { page, limit } = parsePageLimit(searchParams);
  const data = await getInstallmentsByBatch({
    batchId,
    branchId,
    status,
    search,
    page,
    limit,
  });

  return freshAdminJson({ data });
}
