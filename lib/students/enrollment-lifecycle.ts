import type { InstallmentStatus, Prisma } from "@/app/generated/prisma";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { createEnrollmentInstallments } from "@/lib/payments/create-enrollment-installments";
import {
  buildCreateInstallmentsInput,
  buildEnrollmentPaymentData,
} from "@/lib/payments/enrollment-payment-fields";
import {
  applyTransferCreditToEnrollment,
  sumNewEnrollmentPlanTotal,
} from "@/lib/payments/apply-transfer-credit";
import { computeTransferBalance } from "@/lib/students/transfer-balance";
import {
  buildSettlementEnrollmentNote,
  recordTransferSettlement,
  type TransferSettlementInput,
} from "@/lib/students/transfer-settlement";
import {
  decryptEnrollmentNotes,
  encryptEnrollmentNotesForWrite,
} from "@/lib/payments/payment-sensitive";
import type { AssignBatchBody } from "@/types/api/student";

export class EnrollmentLifecycleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "EnrollmentLifecycleError";
  }
}

const ENROLLABLE_BATCH_STATUSES = new Set(["OPEN", "ACTIVE"]);

export type EnrollmentBatchOptions = {
  /** Admin portal: allow enrollment regardless of OPEN/ACTIVE/CLOSED (COMPLETED still blocked). */
  ignoreBatchStatus?: boolean;
};
const TRANSFERABLE_ENROLLMENT_STATUSES = new Set([
  "ACTIVE",
  "SUSPENDED",
  "ON_HOLD",
]);

const CANCELLABLE_INSTALLMENT_STATUSES: InstallmentStatus[] = [
  "PENDING",
  "PARTIAL",
  "OVERDUE",
];

type Tx = Prisma.TransactionClient;

async function loadEnrollableBatch(
  client: Tx | typeof defaultPrisma,
  batchId: string,
  body: AssignBatchBody,
  options: EnrollmentBatchOptions = { ignoreBatchStatus: true },
) {
  const paymentPath = body.paymentPath;
  const batch = await client.batch.findUnique({
    where: { id: batchId },
    include: {
      installmentTemplates: { orderBy: { order: "asc" } },
    },
  });

  if (!batch) {
    throw new EnrollmentLifecycleError("Batch not found", 404);
  }

  if (batch.status === "COMPLETED") {
    throw new EnrollmentLifecycleError("Batch is already completed", 400);
  }

  if (
    !options.ignoreBatchStatus &&
    !ENROLLABLE_BATCH_STATUSES.has(batch.status)
  ) {
    throw new EnrollmentLifecycleError(
      `Batch ${batch.batchCode} is not open for enrollment`,
      400,
    );
  }

  const paymentFields = buildEnrollmentPaymentData(body);
  const usesCustom =
    paymentFields.installmentSource === "CUSTOM" &&
    (body.customInstallments?.length ?? 0) > 0;
  const usesNamedPlan = paymentFields.installmentSource === "NAMED_PLAN";

  if (
    paymentPath === "INSTALLMENT" &&
    !usesCustom &&
    !usesNamedPlan &&
    batch.installmentTemplates.length === 0
  ) {
    throw new EnrollmentLifecycleError(
      "This batch has no payment plan defined. Choose another plan or add custom instalments.",
      400,
    );
  }

  return batch;
}

function parseCustomCourseFee(body: AssignBatchBody): number | undefined {
  if (body.customCourseFee === undefined || body.customCourseFee === null) {
    return undefined;
  }
  if (body.customCourseFee < 0) {
    throw new EnrollmentLifecycleError(
      "Course fee must be a positive number",
      400,
    );
  }
  return body.customCourseFee;
}

/**
 * Creates a new ACTIVE enrollment in a batch (re-enroll, second batch, transfer target).
 */
export async function createBatchEnrollment(
  studentId: string,
  body: AssignBatchBody,
  tx?: Tx,
  options: EnrollmentBatchOptions = { ignoreBatchStatus: true },
) {
  const run = async (client: Tx) => {
    const existingInBatch = await client.enrollment.findUnique({
      where: {
        studentId_batchId: {
          studentId,
          batchId: body.batchId,
        },
      },
      select: { id: true },
    });

    if (existingInBatch) {
      throw new EnrollmentLifecycleError(
        "Student is already enrolled in this batch",
        409,
      );
    }

    const batch = await loadEnrollableBatch(client, body.batchId, body, options);
    const customCourseFee = parseCustomCourseFee(body);

    const paymentFields = buildEnrollmentPaymentData(body);

    const enrollment = await client.enrollment.create({
      data: {
        studentId,
        batchId: body.batchId,
        status: "ACTIVE",
        customCourseFee: customCourseFee ?? null,
        paymentPath: paymentFields.paymentPath,
        installmentSource: paymentFields.installmentSource,
        paymentPlanId: paymentFields.paymentPlanId,
        regFeePaid: body.regFeePaid ?? false,
        ...encryptEnrollmentNotesForWrite(body.notes ?? null),
      },
      select: {
        id: true,
        batchId: true,
        status: true,
        batch: { select: { batchCode: true, name: true } },
      },
    });

    await createEnrollmentInstallments(
      client,
      buildCreateInstallmentsInput(enrollment.id, body, customCourseFee),
    );

    return {
      enrollmentId: enrollment.id,
      batchId: enrollment.batchId!,
      batchCode: enrollment.batch!.batchCode,
      batchName: enrollment.batch!.name,
      status: enrollment.status,
    };
  };

  if (tx) return run(tx);
  return defaultPrisma.$transaction(run);
}

/**
 * Marks an enrollment DROPPED and cancels unpaid instalments (paid rows kept for history).
 */
export async function closeEnrollmentForTransfer(
  enrollmentId: string,
  note?: string,
  tx?: Tx,
) {
  const run = async (client: Tx) => {
    const enrollment = await client.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        notes: true,
        notesEnc: true,
        batch: { select: { batchCode: true } },
      },
    });

    if (!enrollment) {
      throw new EnrollmentLifecycleError("Enrollment not found", 404);
    }

    const noteLine =
      note ??
      (enrollment.batch
        ? `Transferred from ${enrollment.batch.batchCode}`
        : "Enrollment closed");
    const existingNotes = decryptEnrollmentNotes(enrollment);
    const mergedNotes = existingNotes
      ? `${existingNotes}\n${noteLine}`
      : noteLine;

    await client.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "DROPPED",
        ...encryptEnrollmentNotesForWrite(mergedNotes),
      },
    });

    await client.installment.updateMany({
      where: {
        enrollmentId,
        status: { in: CANCELLABLE_INSTALLMENT_STATUSES },
      },
      data: { status: "CANCELLED" },
    });
  };

  if (tx) return run(tx);
  return defaultPrisma.$transaction(run);
}

/**
 * Closes source enrollment and creates a new ACTIVE enrollment on the target batch.
 */
export type TransferEnrollmentOptions = {
  body: AssignBatchBody;
  recordedById: string;
  settlement?: TransferSettlementInput | null;
};

export async function transferEnrollment(
  sourceEnrollmentId: string,
  options: TransferEnrollmentOptions,
) {
  const { body, recordedById, settlement } = options;

  return defaultPrisma.$transaction(async (tx) => {
    const source = await tx.enrollment.findUnique({
      where: { id: sourceEnrollmentId },
      select: {
        id: true,
        studentId: true,
        batchId: true,
        status: true,
        batch: { select: { batchCode: true, branchId: true } },
      },
    });

    if (!source || !source.batchId) {
      throw new EnrollmentLifecycleError("Enrollment not found", 404);
    }

    if (!TRANSFERABLE_ENROLLMENT_STATUSES.has(source.status)) {
      throw new EnrollmentLifecycleError(
        `Cannot transfer enrollment with status ${source.status}`,
        422,
      );
    }

    if (body.batchId === source.batchId) {
      throw new EnrollmentLifecycleError(
        "Cannot transfer to the same batch",
        422,
      );
    }

    const targetBatch = await tx.batch.findUnique({
      where: { id: body.batchId },
      select: { batchCode: true, branchId: true },
    });

    if (!targetBatch) {
      throw new EnrollmentLifecycleError("Target batch not found", 404);
    }

    const balancePreview = await computeTransferBalance(sourceEnrollmentId, tx);
    const totalCollected = balancePreview?.totalCollected ?? 0;

    if (totalCollected > 0.001) {
      if (!settlement) {
        throw new EnrollmentLifecycleError(
          "Choose how to handle collected payments before transferring",
          400,
        );
      }
      if (settlement.amount < 0.01) {
        throw new EnrollmentLifecycleError(
          "Settlement amount must be greater than zero",
          400,
        );
      }
      if (settlement.amount > totalCollected + 0.01) {
        throw new EnrollmentLifecycleError(
          `Settlement amount cannot exceed collected total (LKR ${totalCollected.toFixed(2)})`,
          400,
        );
      }
    }

    await closeEnrollmentForTransfer(
      sourceEnrollmentId,
      `Transferred to ${targetBatch.batchCode}`,
      tx,
    );

    const created = await createBatchEnrollment(source.studentId, body, tx);

    let appliedAmount: number | undefined;
    let settlementNote: string | undefined;

    if (settlement && totalCollected > 0.001) {
      const sourceBatchCode =
        balancePreview?.sourceBatchCode ?? source.batch!.batchCode;

      if (settlement.kind === "APPLY_TO_NEW") {
        const planTotal = await sumNewEnrollmentPlanTotal(
          tx,
          created.enrollmentId,
        );
        const targetBatchFull = await tx.batch.findUnique({
          where: { id: body.batchId },
          select: { registrationFee: true },
        });
        const regFee = Number(targetBatchFull?.registrationFee ?? 0);
        const planCapacity = planTotal + (body.regFeePaid ? 0 : regFee);

        if (settlement.amount > planCapacity + 0.01) {
          throw new EnrollmentLifecycleError(
            `Credit (LKR ${settlement.amount.toFixed(2)}) exceeds new plan capacity (LKR ${planCapacity.toFixed(2)}). Use a larger plan, credit note, or refund.`,
            422,
          );
        }

        const applied = await applyTransferCreditToEnrollment(
          tx,
          created.enrollmentId,
          settlement.amount,
          body.regFeePaid ? 0 : regFee,
        );
        appliedAmount =
          applied.appliedToInstallments +
          (applied.regFeeCovered ? regFee : 0);
        settlementNote = buildSettlementEnrollmentNote(
          settlement.kind,
          settlement.amount,
          sourceBatchCode,
          settlement.notes,
        );
      } else if (settlement.kind === "CREDIT_NOTE") {
        settlementNote = buildSettlementEnrollmentNote(
          settlement.kind,
          settlement.amount,
          sourceBatchCode,
          settlement.notes ??
            "Credit held on file; adjust new instalments or record payments manually.",
        );
      } else if (settlement.kind === "REFUND_RECORD") {
        const sourceNote = buildSettlementEnrollmentNote(
          settlement.kind,
          settlement.amount,
          sourceBatchCode,
          settlement.notes,
        );
        const dropped = await tx.enrollment.findUnique({
          where: { id: sourceEnrollmentId },
          select: { notes: true, notesEnc: true },
        });
        const droppedNotes = dropped
          ? decryptEnrollmentNotes(dropped)
          : null;
        await tx.enrollment.update({
          where: { id: sourceEnrollmentId },
          data: encryptEnrollmentNotesForWrite(
            droppedNotes ? `${droppedNotes}\n${sourceNote}` : sourceNote,
          ),
        });
      } else {
        settlementNote = buildSettlementEnrollmentNote(
          settlement.kind,
          settlement.amount,
          sourceBatchCode,
          settlement.notes,
        );
      }

      await recordTransferSettlement(tx, {
        sourceEnrollmentId,
        targetEnrollmentId: created.enrollmentId,
        settlement,
        recordedById,
        appliedAmount,
      });

      if (settlementNote && settlement.kind !== "REFUND_RECORD") {
        const target = await tx.enrollment.findUnique({
          where: { id: created.enrollmentId },
          select: { notes: true, notesEnc: true },
        });
        const targetNotes = target ? decryptEnrollmentNotes(target) : null;
        const merged = targetNotes
          ? `${targetNotes}\n${settlementNote}`
          : settlementNote;
        await tx.enrollment.update({
          where: { id: created.enrollmentId },
          data: encryptEnrollmentNotesForWrite(merged),
        });
      }
    }

    return {
      sourceEnrollmentId: source.id,
      sourceBatchId: source.batchId,
      sourceBranchId: source.batch!.branchId,
      newEnrollmentId: created.enrollmentId,
      newBatchId: created.batchId,
      newBatchCode: created.batchCode,
      newBranchId: targetBatch.branchId,
      settlementId: settlement ? "recorded" : undefined,
    };
  });
}
