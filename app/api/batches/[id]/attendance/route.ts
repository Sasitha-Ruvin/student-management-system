import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { fetchAttendanceGrid } from "@/lib/batches/batch-queries";
import { prisma } from "@/lib/prisma";
import type { UpdateAttendanceCellBody } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId } = await context.params;

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const grid = await fetchAttendanceGrid(batchId);

  return NextResponse.json(
    { data: grid },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId } = await context.params;

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { branchId: true },
  });

  let body: UpdateAttendanceCellBody;
  try {
    body = (await request.json()) as UpdateAttendanceCellBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.studentId || !body.sessionId) {
    return NextResponse.json(
      { error: "studentId and sessionId are required" },
      { status: 400 },
    );
  }

  const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;
  if (body.status !== null && !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "status must be PRESENT, ABSENT, LATE, or null" },
      { status: 400 },
    );
  }

  // Verify session belongs to this batch
  const session = await prisma.session.findUnique({
    where: { id: body.sessionId },
    select: { id: true, batchId: true, status: true },
  });

  if (!session || session.batchId !== batchId) {
    return NextResponse.json({ error: "Session not found in this batch" }, { status: 404 });
  }

  if (session.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot record attendance for a cancelled session" },
      { status: 422 },
    );
  }

  // Verify student is enrolled in this batch
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      batchId,
      studentId: body.studentId,
      status: { notIn: ["DROPPED", "UNASSIGNED"] },
    },
    select: { id: true },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Student is not actively enrolled in this batch" },
      { status: 422 },
    );
  }

  // null = remove attendance record
  if (body.status === null) {
    await prisma.attendance.deleteMany({
      where: { studentId: body.studentId, sessionId: body.sessionId },
    });

    invalidateOperationalData({
      batchId,
      branchId: batch?.branchId,
    });

    return NextResponse.json({ data: { studentId: body.studentId, sessionId: body.sessionId, status: null } });
  }

  // Upsert attendance
  await prisma.attendance.upsert({
    where: {
      studentId_sessionId: {
        studentId: body.studentId,
        sessionId: body.sessionId,
      },
    },
    create: {
      studentId: body.studentId,
      sessionId: body.sessionId,
      attendanceStatus: body.status,
      source: "ADMIN",
      markedAt: new Date(),
    },
    update: {
      attendanceStatus: body.status,
      source: "ADMIN",
      markedAt: new Date(),
    },
  });

  invalidateOperationalData({
    batchId,
    branchId: batch?.branchId,
  });

  return NextResponse.json({
    data: { studentId: body.studentId, sessionId: body.sessionId, status: body.status },
  });
}
