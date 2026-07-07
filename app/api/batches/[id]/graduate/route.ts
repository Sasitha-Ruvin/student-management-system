import { NextResponse } from "next/server";

import { promoteToAlumni } from "@/lib/alumni/promote-to-alumni";
import { invalidateBatches, invalidateBranches } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { fetchBatchDetail } from "@/lib/batches/batch-queries";
import { isoToDate } from "@/lib/batches/session-generator";
import { prisma } from "@/lib/prisma";
import type { GraduateBatchBody } from "@/types/api/alumni";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["ACTIVE"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
};

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: GraduateBatchBody;
  try {
    body = (await request.json()) as GraduateBatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.graduatedAt) {
    return NextResponse.json(
      { error: "graduatedAt is required" },
      { status: 400 },
    );
  }

  const graduatedAt = isoToDate(body.graduatedAt);
  if (isNaN(graduatedAt.getTime())) {
    return NextResponse.json({ error: "Invalid graduatedAt" }, { status: 400 });
  }

  const existing = await prisma.batch.findUnique({
    where: { id },
    select: { id: true, status: true, branchId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes("COMPLETED")) {
    return NextResponse.json(
      {
        error: `Cannot graduate batch from ${existing.status}`,
        currentStatus: existing.status,
        allowedTransitions: allowed,
      },
      { status: 422 },
    );
  }

  const incompleteCount = await prisma.session.count({
    where: { batchId: id, status: "SCHEDULED" },
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

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { batchId: id, status: "ACTIVE" },
    select: { studentId: true },
  });

  const alumniIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.batch.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    for (const enrollment of activeEnrollments) {
      const result = await promoteToAlumni(
        {
          studentId: enrollment.studentId,
          batchId: id,
          graduatedAt,
        },
        tx,
      );
      if (result) {
        alumniIds.push(result.alumniId);
      }
    }
  });

  invalidateBatches(id);
  invalidateBranches(existing.branchId);

  const batch = await fetchBatchDetail(id);

  return NextResponse.json({
    data: {
      batchId: id,
      status: batch?.status ?? "COMPLETED",
      promotedCount: alumniIds.length,
      alumniIds,
      batch,
    },
  });
}
