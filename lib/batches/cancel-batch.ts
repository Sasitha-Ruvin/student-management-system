import type { InstallmentStatus, Prisma } from "@/app/generated/prisma";
import { prisma as defaultPrisma } from "@/lib/prisma";

const CANCELLABLE_INSTALLMENT_STATUSES: InstallmentStatus[] = [
  "PENDING",
  "PARTIAL",
  "OVERDUE",
];

const DROPPABLE_ENROLLMENT_STATUSES = ["ACTIVE", "SUSPENDED", "ON_HOLD"] as const;

export class CancelBatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CancelBatchError";
  }
}

/**
 * Closes a batch (CLOSED), cancels scheduled sessions, drops open enrollments,
 * and cancels unpaid instalments. Does not promote students to alumni.
 */
export async function cancelBatch(
  batchId: string,
  tx?: Prisma.TransactionClient,
) {
  const run = async (client: Prisma.TransactionClient) => {
    const batch = await client.batch.findUnique({
      where: { id: batchId },
      select: { id: true, status: true, branchId: true },
    });

    if (!batch) {
      throw new CancelBatchError("Batch not found", 404);
    }

    if (batch.status === "COMPLETED") {
      throw new CancelBatchError("Completed batches cannot be cancelled", 422);
    }

    if (batch.status === "CLOSED") {
      throw new CancelBatchError("Batch is already cancelled", 422);
    }

    await client.batch.update({
      where: { id: batchId },
      data: { status: "CLOSED" },
    });

    await client.session.updateMany({
      where: { batchId, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });

    const enrollments = await client.enrollment.findMany({
      where: {
        batchId,
        status: { in: [...DROPPABLE_ENROLLMENT_STATUSES] },
      },
      select: { id: true, notes: true },
    });

    for (const enrollment of enrollments) {
      const noteLine = "Batch cancelled";
      const mergedNotes = enrollment.notes
        ? `${enrollment.notes}\n${noteLine}`
        : noteLine;

      await client.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "DROPPED", notes: mergedNotes },
      });

      await client.installment.updateMany({
        where: {
          enrollmentId: enrollment.id,
          status: { in: CANCELLABLE_INSTALLMENT_STATUSES },
        },
        data: { status: "CANCELLED" },
      });
    }

    return {
      branchId: batch.branchId,
      droppedEnrollmentCount: enrollments.length,
    };
  };

  if (tx) return run(tx);
  return defaultPrisma.$transaction(run);
}
