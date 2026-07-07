import { NextResponse } from "next/server";

import { invalidateBranches } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import type { DeleteClassDayResponse } from "@/types/api/branch";

type RouteContext = {
  params: Promise<{ id: string; dayId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: branchId, dayId } = await context.params;

  const classDay = await prisma.branchClassDay.findUnique({
    where: { id: dayId },
  });

  if (!classDay || classDay.branchId !== branchId) {
    return NextResponse.json(
      { error: "Class day not found" },
      { status: 404 },
    );
  }

  const [, scheduledSessionCount] = await Promise.all([
    prisma.branchClassDay.delete({ where: { id: dayId } }),
    prisma.session.count({
      where: { branchId, status: "SCHEDULED" },
    }),
  ]);

  invalidateBranches(branchId);

  const data: DeleteClassDayResponse = {
    hasScheduledSessions: scheduledSessionCount > 0,
  };

  return NextResponse.json({ data });
}
