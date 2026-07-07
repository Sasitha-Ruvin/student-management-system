import { NextResponse } from "next/server";

import { invalidateBatches, invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { getCachedBatchDetail } from "@/lib/api/cached-queries";
import {
  updateBatchInstallmentTemplates,
  UpdateBatchInstallmentTemplatesError,
} from "@/lib/batches/update-batch-installment-templates";
import { prisma } from "@/lib/prisma";
import type { UpdateBatchInstallmentTemplatesBody } from "@/types/api/batch";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId } = await context.params;

  let body: UpdateBatchInstallmentTemplatesBody;
  try {
    body = (await request.json()) as UpdateBatchInstallmentTemplatesBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(body.templates)) {
    return NextResponse.json(
      { error: "templates must be an array" },
      { status: 400 },
    );
  }

  try {
    const result = await updateBatchInstallmentTemplates({
      batchId,
      templates: body.templates,
      applyToExisting: body.applyToExisting === true,
    });

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { branchId: true },
    });

    invalidateBatches(batchId);
    invalidateOperationalData({ batchId, branchId: batch?.branchId });

    const detail = await getCachedBatchDetail(batchId);
    const extraHeaders: Record<string, string> = {};
    if (result.feeMismatch) {
      extraHeaders["X-Fee-Warning"] = "installments-do-not-match-course-fee";
    }

    return NextResponse.json(
      {
        data: {
          batch: detail,
          sync: {
            dueDatesUpdated: result.dueDatesUpdated,
            amountsUpdated: result.amountsUpdated,
            labelsUpdated: result.labelsUpdated,
            skipped: result.skipped,
          },
          ...(result.feeMismatch
            ? { warning: "Instalment total does not match course fee" }
            : {}),
        },
      },
      { headers: extraHeaders },
    );
  } catch (e) {
    if (e instanceof UpdateBatchInstallmentTemplatesError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
