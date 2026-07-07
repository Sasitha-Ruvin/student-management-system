import { NextResponse } from "next/server";

import { invalidateBatches, invalidateBranches } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { getCachedBatchDetail } from "@/lib/api/cached-queries";
import { fetchBatchDetail } from "@/lib/batches/batch-queries";
import { isoToDate } from "@/lib/batches/session-generator";
import { deleteBatch, DeleteBatchError } from "@/lib/batches/delete-batch";
import { prisma } from "@/lib/prisma";
import type { UpdateBatchBody } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ACTIVE"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
};

function privateJson<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-cache" },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const data = await getCachedBatchDetail(id);

  if (!data) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  return privateJson({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: UpdateBatchBody;
  try {
    body = (await request.json()) as UpdateBatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, endDate, status, registrationFee, courseFee, defaultClassTime } = body;

  if (
    name === undefined &&
    endDate === undefined &&
    status === undefined &&
    registrationFee === undefined &&
    courseFee === undefined &&
    defaultClassTime === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field is required" },
      { status: 400 },
    );
  }

  const existing = await prisma.batch.findUnique({
    where: { id },
    select: { id: true, status: true, branchId: true, startDate: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // ── Status transition validation ──────────────────────────────────
  if (status !== undefined) {
    if (status === "OPEN") {
      if (existing.status === "COMPLETED") {
        return NextResponse.json(
          {
            error: "Cannot reopen registration for a completed batch",
            currentStatus: existing.status,
          },
          { status: 422 },
        );
      }
    } else {
      const allowed = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition batch from ${existing.status} to ${status}`,
            currentStatus: existing.status,
            allowedTransitions: allowed,
          },
          { status: 422 },
        );
      }
    }

    if (status === "COMPLETED") {
      const incompleteCount = await prisma.session.count({
        where: {
          batchId: id,
          status: "SCHEDULED",
        },
      });

      if (incompleteCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot complete batch: ${incompleteCount} session(s) are still SCHEDULED. Complete or cancel all sessions first.`,
            incompleteSessionCount: incompleteCount,
          },
          { status: 422 },
        );
      }
    }
  }

  // ── endDate must be after startDate ───────────────────────────────
  const warnings: string[] = [];
  let newEndDateParsed: Date | undefined;

  if (endDate !== undefined) {
    newEndDateParsed = isoToDate(endDate);
    if (isNaN(newEndDateParsed.getTime())) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    }
    if (newEndDateParsed <= existing.startDate) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 },
      );
    }

    const sessionBounds = await prisma.session.aggregate({
      where: { batchId: id },
      _min: { scheduledAt: true },
      _max: { scheduledAt: true },
    });

    const startDay = existing.startDate;
    const endDay = newEndDateParsed;

    if (sessionBounds._min.scheduledAt) {
      const min = sessionBounds._min.scheduledAt;
      if (min < startDay || min > endDay) {
        warnings.push(
          "Some sessions are scheduled before the batch start date or after the new end date.",
        );
      }
    }
    if (sessionBounds._max.scheduledAt && sessionBounds._max.scheduledAt > endDay) {
      if (!warnings.length) {
        warnings.push(
          "Some sessions are scheduled after the new batch end date.",
        );
      }
    }
  }

  const updateData: Parameters<typeof prisma.batch.update>[0]["data"] = {};
  if (name !== undefined) updateData.name = name.trim();
  if (endDate !== undefined) updateData.endDate = newEndDateParsed!;
  if (status !== undefined) updateData.status = status;
  if (registrationFee !== undefined) updateData.registrationFee = registrationFee;
  if (courseFee !== undefined) updateData.courseFee = courseFee;
  if (defaultClassTime !== undefined) updateData.defaultClassTime = defaultClassTime;

  await prisma.batch.update({ where: { id }, data: updateData });

  invalidateBatches(id);
  invalidateBranches(existing.branchId);

  const updated = await getCachedBatchDetail(id);
  return privateJson({
    data: updated,
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteBatch(id);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    if (err instanceof DeleteBatchError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    throw err;
  }
}
