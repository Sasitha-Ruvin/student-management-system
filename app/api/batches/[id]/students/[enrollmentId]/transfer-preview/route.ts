import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { computeTransferBalance } from "@/lib/students/transfer-balance";

type RouteContext = {
  params: Promise<{ id: string; enrollmentId: string }>;
};

/**
 * GET /api/batches/[id]/students/[enrollmentId]/transfer-preview
 *
 * Collected balance on the source enrollment before transfer.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId, enrollmentId } = await context.params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { batchId: true },
  });

  if (!enrollment || enrollment.batchId !== batchId) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const preview = await computeTransferBalance(enrollmentId);
  if (!preview) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  return NextResponse.json({ data: preview });
}
