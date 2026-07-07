import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { isoToDate } from "@/lib/batches/session-generator";
import { sendSessionStudentSmsIfRequested } from "@/lib/notifications/send-session-student-sms-if-requested";
import { prisma } from "@/lib/prisma";
import type { BulkRescheduleBody, SessionEditSmsResult } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId } = await context.params;

  let body: BulkRescheduleBody;
  try {
    body = (await request.json()) as BulkRescheduleBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.fromDate) {
    return NextResponse.json({ error: "fromDate is required" }, { status: 400 });
  }

  if (typeof body.pushDays !== "number" || body.pushDays < 1 || !Number.isInteger(body.pushDays)) {
    return NextResponse.json(
      { error: "pushDays must be a positive integer" },
      { status: 400 },
    );
  }

  if (body.pushDays > 365) {
    return NextResponse.json(
      { error: "pushDays cannot exceed 365" },
      { status: 400 },
    );
  }

  const fromDate = isoToDate(body.fromDate);
  if (isNaN(fromDate.getTime())) {
    return NextResponse.json({ error: "Invalid fromDate" }, { status: 400 });
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true, endDate: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (batch.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot reschedule sessions in a completed batch" },
      { status: 422 },
    );
  }

  // Load all SCHEDULED and RESCHEDULED sessions on or after fromDate
  const sessions = await prisma.session.findMany({
    where: {
      batchId,
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      scheduledAt: { gte: fromDate },
    },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
  });

  if (sessions.length === 0) {
    return NextResponse.json({ data: { updatedCount: 0 } });
  }

  // Update each session date by adding pushDays
  const MS_PER_DAY = 86_400_000;
  const pushMs = body.pushDays * MS_PER_DAY;

  await prisma.$transaction([
    ...sessions.map((s) =>
      prisma.session.update({
        where: { id: s.id },
        data: {
          scheduledAt: new Date(s.scheduledAt.getTime() + pushMs),
          status: "RESCHEDULED",
        },
      }),
    ),
    // Extend batch endDate by the same number of days
    prisma.batch.update({
      where: { id: batchId },
      data: { endDate: new Date(batch.endDate.getTime() + pushMs) },
    }),
  ]);

  invalidateOperationalData({ batchId });

  let smsSummary: SessionEditSmsResult | undefined;
  const smsWarnings: string[] = [];

  if (body.notifyStudents) {
    const aggregate: SessionEditSmsResult = {
      sent: 0,
      failed: 0,
      skippedNoPhone: 0,
      skippedNotConfigured: 0,
      totalEnrolled: 0,
    };

    for (const s of sessions) {
      const smsPayload = await sendSessionStudentSmsIfRequested({
        sessionId: s.id,
        notifyStudents: true,
        studentMessage: body.studentMessage,
        templateId: body.templateId ?? null,
      });

      if (smsPayload?.error) {
        smsWarnings.push(smsPayload.error);
        continue;
      }

      const r = smsPayload?.smsResult;
      if (!r) continue;

      aggregate.sent += r.sent;
      aggregate.failed += r.failed;
      aggregate.skippedNoPhone += r.skippedNoPhone;
      aggregate.skippedNotConfigured = Math.max(
        aggregate.skippedNotConfigured,
        r.skippedNotConfigured,
      );
      aggregate.totalEnrolled = Math.max(aggregate.totalEnrolled, r.totalEnrolled);
      if (r.lastError) aggregate.lastError = r.lastError;
    }

    smsSummary = aggregate;
  }

  return NextResponse.json({
    data: {
      updatedCount: sessions.length,
      ...(smsSummary ? { smsResult: smsSummary } : {}),
      ...(smsWarnings.length > 0 ? { warning: smsWarnings.join("; ") } : {}),
    },
  });
}
