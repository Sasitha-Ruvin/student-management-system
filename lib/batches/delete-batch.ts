import { prisma as defaultPrisma } from "@/lib/prisma";

export class DeleteBatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DeleteBatchError";
  }
}

/**
 * Hard-deletes a cancelled (CLOSED) batch.
 *
 * Cascades handled:
 *  - sessions        RESTRICT → deleted first
 *  - installment_templates RESTRICT → deleted first
 *  - alumni          RESTRICT → blocks deletion (data must be preserved)
 *  - enrollments     SET NULL → auto-nulled by Postgres
 */
export async function deleteBatch(batchId: string): Promise<void> {
  const batch = await defaultPrisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, status: true },
  });

  if (!batch) {
    throw new DeleteBatchError("Batch not found", 404);
  }

  if (batch.status !== "CLOSED") {
    throw new DeleteBatchError(
      "Only cancelled batches can be deleted",
      422,
    );
  }

  const alumniCount = await defaultPrisma.alumni.count({
    where: { batchId },
  });

  if (alumniCount > 0) {
    throw new DeleteBatchError(
      `Cannot delete batch: ${alumniCount} alumni record(s) reference this batch`,
      409,
    );
  }

  await defaultPrisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { batchId } });
    await tx.installmentTemplate.deleteMany({ where: { batchId } });
    await tx.batch.delete({ where: { id: batchId } });
  });
}
