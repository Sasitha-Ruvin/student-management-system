import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { sendSessionStudentSmsIfRequested } from "@/lib/notifications/send-session-student-sms-if-requested";
import {
  mergeSessionScheduleMeta,
  parseSessionScheduleMeta,
  validateSessionEndTime,
} from "@/lib/sessions/session-schedule-meta";
import { fetchBatchSessions } from "@/lib/batches/batch-queries";
import { prisma } from "@/lib/prisma";
import type { CreateSessionBody } from "@/types/api/batch";

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

  const sessions = await fetchBatchSessions(batchId);

  return NextResponse.json(
    { data: sessions },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId } = await context.params;

  let body: CreateSessionBody;
  try {
    body = (await request.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true, branchId: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (batch.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot add sessions to a completed batch" },
      { status: 422 },
    );
  }

  // Determine branch
  const branchId = body.branchId ?? batch.branchId;
  const branchExists = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true },
  });
  if (!branchExists) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  if (body.pin !== undefined && body.pin !== null && body.pin !== "") {
    if (!/^\d{4}$/.test(body.pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 },
      );
    }
  }

  let scheduledEndAt: Date | null = null;
  if (body.scheduledEndAt) {
    scheduledEndAt = new Date(body.scheduledEndAt);
    const endError = validateSessionEndTime(scheduledAt, scheduledEndAt);
    if (endError) {
      return NextResponse.json({ error: endError }, { status: 400 });
    }
  }

  const storedNotes = mergeSessionScheduleMeta(body.notes ?? null, scheduledEndAt);

  // Get next session number
  const maxSession = await prisma.session.aggregate({
    where: { batchId },
    _max: { sessionNumber: true },
  });
  const nextNumber = (maxSession._max.sessionNumber ?? 0) + 1;

  const session = await prisma.session.create({
    data: {
      batchId,
      branchId,
      sessionNumber: nextNumber,
      scheduledAt,
      status: "SCHEDULED",
      pin: body.pin && body.pin !== "" ? body.pin : null,
      notes: storedNotes,
    },
    include: {
      branch: { select: { name: true } },
      batch: { select: { branchId: true, startDate: true, endDate: true } },
      _count: { select: { attendances: true } },
    },
  });

  const sessionCount = await prisma.session.count({ where: { batchId } });
  await prisma.batch.update({
    where: { id: batchId },
    data: { totalSessions: sessionCount },
  });

  const warnings: string[] = [];
  const schedDay = scheduledAt;
  if (
    schedDay < session.batch.startDate ||
    schedDay > session.batch.endDate
  ) {
    warnings.push(
      "Session date falls outside the batch start/end date range.",
    );
  }

  invalidateOperationalData({ batchId });

  const smsResponse = await sendSessionStudentSmsIfRequested({
    sessionId: session.id,
    notifyStudents: body.notifyStudents,
    studentMessage: body.studentMessage,
    templateId: body.templateId,
  });

  return NextResponse.json(
    {
      data: {
        id: session.id,
        sessionNumber: session.sessionNumber,
        scheduledAt: session.scheduledAt.toISOString(),
        scheduledEndAt: scheduledEndAt?.toISOString() ?? null,
        branchId: session.branchId,
        branchName: session.branch.name,
        status: session.status,
        pin: session.pin,
        attendanceCount: session._count.attendances,
        presentCount: 0,
        isRelocated: session.branchId !== session.batch.branchId,
      },
      ...(warnings.length > 0 ? { warnings } : {}),
      ...(smsResponse?.smsResult ? { smsResult: smsResponse.smsResult } : {}),
      ...(smsResponse?.warning ? { warning: smsResponse.warning } : {}),
      ...(smsResponse?.error ? { smsWarning: smsResponse.error } : {}),
    },
    { status: 201 },
  );
}
