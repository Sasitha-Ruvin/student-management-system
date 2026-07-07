import { NextResponse } from "next/server";

import { cancelBatch, CancelBatchError } from "@/lib/batches/cancel-batch";
import { fetchBatchDetail } from "@/lib/batches/batch-queries";
import { invalidateBatches, invalidateBranches } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const { branchId, droppedEnrollmentCount } = await cancelBatch(id);
    invalidateBatches(id);
    invalidateBranches(branchId);

    const batch = await fetchBatchDetail(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        batchId: id,
        status: batch.status,
        droppedEnrollmentCount,
        batch,
      },
    });
  } catch (e) {
    if (e instanceof CancelBatchError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
