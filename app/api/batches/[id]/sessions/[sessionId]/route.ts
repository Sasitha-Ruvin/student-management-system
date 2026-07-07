import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
// import { sendSessionStudentMessage } from "@/lib/email/send-session-student-message";
import {
  buildSessionEditNotificationSummary,
  describeSmsOutcome,
} from "@/lib/notifications/build-session-edit-warning";
import { sendSessionStudentSmsIfRequested } from "@/lib/notifications/send-session-student-sms-if-requested";
import { prisma } from "@/lib/prisma";
import {
  mergeSessionScheduleMeta,
  parseSessionScheduleMeta,
  splitStoredSessionNotes,
  validateSessionEndTime,
} from "@/lib/sessions/session-schedule-meta";
import type { UpdateSessionAction } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: batchId, sessionId } = await context.params;

  let body: UpdateSessionAction;
  try {
    body = (await request.json()) as UpdateSessionAction;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, batchId: true, status: true, branchId: true, notes: true, sessionNumber: true },
  });

  if (!session || session.batchId !== batchId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const reorderActions = [
    "move-up",
    "move-down",
    "set-session-number",
  ] as const;
  if (
    session.status === "CANCELLED" &&
    body.action !== "reschedule" &&
    !reorderActions.includes(body.action as (typeof reorderActions)[number])
  ) {
    return NextResponse.json(
      { error: "Cannot modify a cancelled session" },
      { status: 422 },
    );
  }

  const { action } = body;

  // ── Update details (admin correction — does not change status or notify) ──
  if (action === "update-details") {
    if (session.status === "COMPLETED" || session.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot edit a completed or cancelled session" },
        { status: 422 },
      );
    }

    if (!("scheduledAt" in body) || !body.scheduledAt) {
      return NextResponse.json(
        { error: "scheduledAt is required" },
        { status: 400 },
      );
    }

    if (!("branchId" in body) || !body.branchId) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    const newDate = new Date(body.scheduledAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }

    let scheduledEndAt: Date | null | undefined;
    if ("scheduledEndAt" in body) {
      scheduledEndAt = body.scheduledEndAt ? new Date(body.scheduledEndAt) : null;
      if (scheduledEndAt && isNaN(scheduledEndAt.getTime())) {
        return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
      }
      const endError = validateSessionEndTime(newDate, scheduledEndAt);
      if (endError) {
        return NextResponse.json({ error: endError }, { status: 400 });
      }
    }

    const branch = await prisma.branch.findUnique({
      where: { id: body.branchId },
      select: { id: true, isActive: true },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    if (!branch.isActive) {
      return NextResponse.json(
        { error: "Cannot assign to an inactive branch" },
        { status: 422 },
      );
    }

    let pinValue: string | null | undefined;
    if (body.clearPin) {
      pinValue = null;
    } else if (body.pin !== undefined) {
      const trimmed = body.pin?.trim() ?? "";
      if (trimmed && !/^\d{4}$/.test(trimmed)) {
        return NextResponse.json(
          { error: "PIN must be exactly 4 digits" },
          { status: 400 },
        );
      }
      pinValue = trimmed || null;
    }

    const existingSchedule = parseSessionScheduleMeta(session.notes);
    const nextDisplayNotes =
      body.notes !== undefined ? body.notes?.trim() || null : existingSchedule.displayNotes;
    const nextEndAt =
      scheduledEndAt !== undefined ? scheduledEndAt : existingSchedule.scheduledEndAt;
    const storedNotes = mergeSessionScheduleMeta(nextDisplayNotes, nextEndAt);

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        scheduledAt: newDate,
        branchId: body.branchId,
        notes: storedNotes,
        ...(pinValue !== undefined ? { pin: pinValue } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        branchId: true,
        notes: true,
        pin: true,
        status: true,
      },
    });

    invalidateOperationalData({ batchId });
    const schedule = splitStoredSessionNotes(updated.notes);
    return NextResponse.json({
      data: {
        sessionId: updated.id,
        scheduledAt: updated.scheduledAt.toISOString(),
        scheduledEndAt: schedule.scheduledEndAt,
        branchId: updated.branchId,
        notes: schedule.notes,
        pin: updated.pin,
        status: updated.status,
      },
    });
  }

  // ── Reschedule ────────────────────────────────────────────────────
  if (action === "reschedule") {
    if (!("scheduledAt" in body) || !body.scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required for reschedule" }, { status: 400 });
    }

    const newDate = new Date(body.scheduledAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: {
        scheduledAt: newDate,
        status: "RESCHEDULED",
      },
    });

    const smsPayload = await sendSessionStudentSmsIfRequested({
      sessionId,
      notifyStudents: body.notifyStudents,
      studentMessage: body.studentMessage,
      templateId: "templateId" in body ? body.templateId : null,
    });

    if (smsPayload?.error) {
      invalidateOperationalData({ batchId });
      return NextResponse.json(
        {
          error: smsPayload.error,
          data: {
            sessionId: updated.id,
            scheduledAt: updated.scheduledAt.toISOString(),
            status: updated.status,
            smsResult: smsPayload.smsResult,
          },
        },
        { status: smsPayload.statusCode ?? 422 },
      );
    }

    invalidateOperationalData({ batchId });
    return NextResponse.json({
      data: {
        sessionId: updated.id,
        scheduledAt: updated.scheduledAt.toISOString(),
        status: updated.status,
        ...(smsPayload?.smsResult ? { smsResult: smsPayload.smsResult } : {}),
        ...(smsPayload?.message ? { message: smsPayload.message } : {}),
        ...(smsPayload?.warning ? { warning: smsPayload.warning } : {}),
      },
    });
  }

  // ── Relocate ──────────────────────────────────────────────────────
  if (action === "relocate") {
    if (!("branchId" in body) || !body.branchId) {
      return NextResponse.json({ error: "branchId is required for relocate" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: body.branchId },
      select: { id: true, isActive: true },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    if (!branch.isActive) {
      return NextResponse.json({ error: "Cannot relocate to an inactive branch" }, { status: 422 });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { branchId: body.branchId },
    });

    invalidateOperationalData({ batchId });
    return NextResponse.json({ data: { sessionId: updated.id, branchId: updated.branchId } });
  }

  // ── Cancel ────────────────────────────────────────────────────────
  if (action === "cancel") {
    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot cancel a completed session" },
        { status: 422 },
      );
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    });

    const smsPayload = await sendSessionStudentSmsIfRequested({
      sessionId,
      notifyStudents: body.notifyStudents,
      studentMessage: body.studentMessage,
      templateId: "templateId" in body ? body.templateId : null,
    });

    if (smsPayload?.error) {
      invalidateOperationalData({ batchId });
      return NextResponse.json(
        {
          error: smsPayload.error,
          data: {
            sessionId: updated.id,
            status: updated.status,
            smsResult: smsPayload.smsResult,
          },
        },
        { status: smsPayload.statusCode ?? 422 },
      );
    }

    invalidateOperationalData({ batchId });
    return NextResponse.json({
      data: {
        sessionId: updated.id,
        status: updated.status,
        ...(smsPayload?.smsResult ? { smsResult: smsPayload.smsResult } : {}),
        ...(smsPayload?.message ? { message: smsPayload.message } : {}),
        ...(smsPayload?.warning ? { warning: smsPayload.warning } : {}),
      },
    });
  }

  // ── Complete ──────────────────────────────────────────────────────
  if (action === "complete") {
    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Session is already completed" },
        { status: 422 },
      );
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    });

    invalidateOperationalData({ batchId });
    return NextResponse.json({ data: { sessionId: updated.id, status: updated.status } });
  }

  // ── Set PIN ───────────────────────────────────────────────────────
  if (action === "set-pin") {
    if (!("pin" in body) || !body.pin?.trim()) {
      return NextResponse.json({ error: "pin is required for set-pin" }, { status: 400 });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { pin: body.pin.trim() },
    });

    invalidateOperationalData({ batchId });
    return NextResponse.json({ data: { sessionId: updated.id, pin: updated.pin } });
  }

  // ── Clear PIN ─────────────────────────────────────────────────────
  if (action === "clear-pin") {
    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { pin: null },
    });

    invalidateOperationalData({ batchId });
    return NextResponse.json({ data: { sessionId: updated.id, pin: null } });
  }

  // ── Send student message via SMS (email disabled until nodemailer is installed) ──
  if (action === "edit") {
    if (session.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot edit a cancelled session" },
        { status: 422 },
      );
    }

    const templateId =
      "templateId" in body ? (body.templateId ?? null) : null;
    const studentMessage =
      "studentMessage" in body && body.studentMessage?.trim()
        ? body.studentMessage.trim()
        : "";

    const smsPayload = await sendSessionStudentSmsIfRequested({
      sessionId,
      notifyStudents: true,
      studentMessage,
      templateId,
    });

    if (smsPayload?.error) {
      return NextResponse.json(
        {
          error: smsPayload.error,
          data: { sessionId, smsResult: smsPayload.smsResult },
        },
        { status: smsPayload.statusCode ?? 422 },
      );
    }

    const smsResult = smsPayload?.smsResult;
    const smsOutcome = describeSmsOutcome(smsResult);

    if (!smsOutcome.success) {
      return NextResponse.json(
        {
          error: smsOutcome.message,
          data: { sessionId, smsResult },
        },
        { status: 422 },
      );
    }

    const { message, warning } = buildSessionEditNotificationSummary(
      undefined,
      smsResult,
    );

    return NextResponse.json({
      data: {
        sessionId,
        smsResult,
        message,
        ...(warning ? { warning } : {}),
      },
    });
  }

  // ── Set session number (swap if another session already has that number) ──
  if (action === "set-session-number") {
    if (!("sessionNumber" in body)) {
      return NextResponse.json(
        { error: "sessionNumber is required" },
        { status: 400 },
      );
    }

    const nextNumber = Number(body.sessionNumber);
    if (!Number.isInteger(nextNumber) || nextNumber < 1) {
      return NextResponse.json(
        { error: "sessionNumber must be a positive integer" },
        { status: 400 },
      );
    }

    const currentNumber = session.sessionNumber;
    if (nextNumber === currentNumber) {
      return NextResponse.json({
        data: { sessionId, sessionNumber: currentNumber },
      });
    }

    const occupant = await prisma.session.findFirst({
      where: {
        batchId,
        sessionNumber: nextNumber,
        id: { not: sessionId },
      },
      select: { id: true },
    });

    if (occupant) {
      await prisma.$transaction([
        prisma.session.update({
          where: { id: sessionId },
          data: { sessionNumber: nextNumber },
        }),
        prisma.session.update({
          where: { id: occupant.id },
          data: { sessionNumber: currentNumber },
        }),
      ]);
    } else {
      await prisma.session.update({
        where: { id: sessionId },
        data: { sessionNumber: nextNumber },
      });
    }

    invalidateOperationalData({ batchId });
    return NextResponse.json({
      data: {
        sessionId,
        sessionNumber: nextNumber,
        ...(occupant ? { swappedWith: occupant.id } : {}),
      },
    });
  }

  // ── Move up / move down (swap sessionNumbers with adjacent session) ──
  if (action === "move-up" || action === "move-down") {
    const currentNumber = session.sessionNumber;

    // Find the adjacent session to swap with
    const adjacent = await prisma.session.findFirst({
      where: {
        batchId,
        sessionNumber:
          action === "move-up" ? { lt: currentNumber } : { gt: currentNumber },
      },
      orderBy: {
        sessionNumber: action === "move-up" ? "desc" : "asc",
      },
      select: { id: true, sessionNumber: true },
    });

    if (!adjacent) {
      return NextResponse.json(
        { error: "Session is already at the boundary and cannot be moved further" },
        { status: 422 },
      );
    }

    // Swap using a transaction — no unique constraint so direct swap is safe
    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: { sessionNumber: adjacent.sessionNumber },
      }),
      prisma.session.update({
        where: { id: adjacent.id },
        data: { sessionNumber: currentNumber },
      }),
    ]);

    invalidateOperationalData({ batchId });
    return NextResponse.json({
      data: {
        sessionId,
        sessionNumber: adjacent.sessionNumber,
        swappedWith: adjacent.id,
      },
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
