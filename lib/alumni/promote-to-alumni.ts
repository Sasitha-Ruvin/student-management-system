import type { Prisma } from "@/app/generated/prisma";
import { encryptOptional } from "@/lib/pii-crypto";
import { prisma as defaultPrisma } from "@/lib/prisma";

const SKIP_ENROLLMENT_STATUSES = new Set([
  "SUSPENDED",
  "ON_HOLD",
  "DROPPED",
  "UNASSIGNED",
]);

export type PromoteToAlumniInput = {
  studentId: string;
  batchId: string;
  graduatedAt: Date;
  notes?: string | null;
};

export type PromoteToAlumniResult = {
  alumniId: string;
  created: boolean;
};

/**
 * Promotes a student to alumni for a given batch intake.
 * - Completes ACTIVE enrollment for (studentId, batchId).
 * - Upserts Alumni (moves prior batchId to previousBatchId on update).
 * - Disables portal login.
 * Returns null if enrollment is missing or in a non-promotable status.
 */
export async function promoteToAlumni(
  input: PromoteToAlumniInput,
  tx: Prisma.TransactionClient = defaultPrisma,
): Promise<PromoteToAlumniResult | null> {
  const enrollment = await tx.enrollment.findUnique({
    where: {
      studentId_batchId: {
        studentId: input.studentId,
        batchId: input.batchId,
      },
    },
    select: { id: true, status: true },
  });

  if (!enrollment || SKIP_ENROLLMENT_STATUSES.has(enrollment.status)) {
    return null;
  }

  if (enrollment.status === "ACTIVE") {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "COMPLETED" },
    });
  }

  const existing = await tx.alumni.findUnique({
    where: { studentId: input.studentId },
    select: { id: true, batchId: true },
  });

  let alumniId: string;
  let created: boolean;

  if (existing) {
    await tx.alumni.update({
      where: { id: existing.id },
      data: {
        previousBatchId: existing.batchId,
        batchId: input.batchId,
        graduatedAt: input.graduatedAt,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    alumniId = existing.id;
    created = false;
  } else {
    const row = await tx.alumni.create({
      data: {
        studentId: input.studentId,
        batchId: input.batchId,
        graduatedAt: input.graduatedAt,
        notes: input.notes ?? null,
      },
    });
    alumniId = row.id;
    created = true;
  }

  await tx.student.update({
    where: { id: input.studentId },
    data: {
      isLoginEnabled: false,
      loginDisabledNote: "Graduated",
    },
  });

  return { alumniId, created };
}
