import type { PrismaClient } from "@/app/generated/prisma";
import { generateUniqueBatchCode } from "@/lib/batches/batch-code-generator";
import { applyClassTimeColombo } from "@/lib/sessions/colombo-time";
import { isoToDate } from "@/lib/batches/session-generator";
import {
  mergeSessionScheduleMeta,
  validateSessionEndTime,
} from "@/lib/sessions/session-schedule-meta";
import type { ConfirmedSessionInput, CreateBatchBody } from "@/types/api/batch";

export const MAX_SESSION_DATE_RANGE_DAYS = 730; // 2 years

export type CreateBatchResult = {
  batchId: string;
  batchCode: string;
  sessionCount: number;
  feeMismatch: boolean;
};

/**
 * Creates a batch, all its sessions, and all installment templates
 * in a single Prisma transaction.
 */
export async function createBatchTransaction(
  prisma: PrismaClient,
  body: CreateBatchBody,
  branch: { branchCode: string; id: string },
): Promise<CreateBatchResult> {
  const startDate = isoToDate(body.startDate);
  const endDate = isoToDate(body.endDate);

  const confirmedSessions = normalizeConfirmedSessions(body);

  // Validate session dates from client
  if (confirmedSessions.length === 0) {
    throw new Error("At least one session date is required");
  }

  if (body.installments.length === 0) {
    throw new Error("At least one installment is required");
  }

  const installmentSum = body.installments.reduce((s, i) => s + i.amount, 0);
  const feeMismatch = Math.abs(installmentSum - body.courseFee) > 0.01;

  const sessionDates = confirmedSessions
    .map((sess) => {
      const d = isoToDate(sess.date);
      if (d < startDate || d > endDate) {
        throw new Error(
          `Session date ${sess.date} is outside batch start/end range`,
        );
      }
      return d;
    })
    .sort((a, b) => a.getTime() - b.getTime());

  const batchCode = await generateUniqueBatchCode(
    prisma,
    branch.branchCode,
    startDate,
  );

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        batchCode,
        name: body.name.trim(),
        branchId: body.branchId,
        startDate,
        endDate,
        defaultClassTime: body.defaultClassTime,
        defaultClassEndTime: body.defaultClassEndTime?.trim() || null,
        status: "OPEN",
        totalSessions: sessionDates.length,
        maxCapacity: body.maxCapacity ?? null,
        registrationFee: body.registrationFee,
        courseFee: body.courseFee,
        paymentPlanId: body.paymentPlanId ?? null,
      },
    });

    // Create sessions — per-row class time / optional end time (Colombo)
    const sortedSessions = [...confirmedSessions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const sessionData = sortedSessions.map((sess, idx) => {
      const datePart = sess.date.slice(0, 10);
      const classTime = sess.classTime?.trim() || body.defaultClassTime;
      const scheduledAt = applyClassTimeColombo(datePart, classTime);

      let notes: string | null = null;
      const endTime =
        sess.classEndTime?.trim() || body.defaultClassEndTime?.trim() || "";
      if (endTime) {
        const scheduledEndAt = applyClassTimeColombo(datePart, endTime);
        const endErr = validateSessionEndTime(scheduledAt, scheduledEndAt);
        if (endErr) {
          throw new Error(`Session ${datePart}: ${endErr}`);
        }
        notes = mergeSessionScheduleMeta(null, scheduledEndAt);
      }

      return {
        batchId: batch.id,
        branchId: body.branchId,
        sessionNumber: idx + 1,
        scheduledAt,
        notes,
        status: "SCHEDULED" as const,
      };
    });

    await tx.session.createMany({ data: sessionData });

    // Create installment templates
    const templateData = body.installments.map((inst) => ({
      batchId: batch.id,
      label: inst.label.trim(),
      amount: inst.amount,
      dueDate: isoToDate(inst.dueDate),
      order: inst.order,
    }));

    await tx.installmentTemplate.createMany({ data: templateData });

    return {
      batchId: batch.id,
      batchCode: batch.batchCode,
      sessionCount: sessionDates.length,
      feeMismatch,
    };
  });

  return result;
}

function normalizeConfirmedSessions(body: CreateBatchBody): ConfirmedSessionInput[] {
  if (Array.isArray(body.confirmedSessions) && body.confirmedSessions.length > 0) {
    return body.confirmedSessions;
  }
  return [];
}
