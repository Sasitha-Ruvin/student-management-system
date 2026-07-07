import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; attendanceId: string }>;
};

// DELETE /api/sessions/[id]/attendance/[attendanceId]
// Removes a single attendance record — student shows as "—" (not marked).
export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: sessionId, attendanceId } = await context.params;

  // Verify the record exists and belongs to this session
  const record = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      id: true,
      sessionId: true,
      session: { select: { batchId: true, branchId: true } },
    },
  });

  if (!record || record.sessionId !== sessionId) {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }

  await prisma.attendance.delete({ where: { id: attendanceId } });

  invalidateOperationalData({
    batchId: record.session.batchId,
    branchId: record.session.branchId,
  });

  return new NextResponse(null, { status: 204 });
}
