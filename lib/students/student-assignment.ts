import { prisma } from "@/lib/prisma";
import { createEnrollmentInstallments } from "@/lib/payments/create-enrollment-installments";
import {
  buildCreateInstallmentsInput,
  buildEnrollmentPaymentData,
} from "@/lib/payments/enrollment-payment-fields";
import { generateModelCode } from "@/lib/students/model-code-generator";
import { needsModelCodeOnApproval } from "@/lib/students/student-source";
import type { AssignBatchBody } from "@/types/api/student";

export class AssignmentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AssignmentError";
  }
}

async function resolveModelCodeForAssignment(
  studentId: string,
  source: string,
  currentModelCode: string,
  requestedModelCode: string | undefined,
): Promise<string | null> {
  if (!needsModelCodeOnApproval(source, currentModelCode)) {
    return null;
  }

  const nextCode =
    requestedModelCode?.trim() || (await generateModelCode(prisma));

  if (!nextCode) {
    throw new AssignmentError("Model code is required for website applicants", 400);
  }

  const duplicate = await prisma.student.findFirst({
    where: {
      modelCode: nextCode,
      NOT: { id: studentId },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new AssignmentError(`Model code "${nextCode}" is already in use`, 409);
  }

  return nextCode;
}

/**
 * Assigns a student's UNASSIGNED enrollment to a batch.
 * Creates installments based on the payment path.
 * Website applicants with a temporary WEBSITE-* code receive a real model code here.
 */
export type AssignStudentToBatchOptions = {
  /** Admin portal: allow enrollment regardless of OPEN/ACTIVE/CLOSED (COMPLETED still blocked). */
  ignoreBatchStatus?: boolean;
};

export async function assignStudentToBatch(
  studentId: string,
  body: AssignBatchBody,
  options: AssignStudentToBatchOptions = { ignoreBatchStatus: true },
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, source: true, modelCode: true },
  });

  if (!student) {
    throw new AssignmentError("Student not found", 404);
  }

  const resolvedModelCode = await resolveModelCodeForAssignment(
    studentId,
    student.source,
    student.modelCode,
    body.modelCode,
  );

  // Load the student's UNASSIGNED enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "UNASSIGNED" },
    select: { id: true, studentId: true, status: true },
  });

  if (!enrollment) {
    throw new AssignmentError(
      "Student does not have an unassigned enrollment",
      400,
    );
  }

  // Check for existing active enrollment in this batch
  const existingInBatch = await prisma.enrollment.findUnique({
    where: {
      studentId_batchId: {
        studentId,
        batchId: body.batchId,
      },
    },
    select: { id: true },
  });

  if (existingInBatch) {
    throw new AssignmentError(
      "Student is already enrolled in this batch",
      409,
    );
  }

  // Load the target batch
  const batch = await prisma.batch.findUnique({
    where: { id: body.batchId },
    include: {
      installmentTemplates: { orderBy: { order: "asc" } },
    },
  });

  if (!batch) {
    throw new AssignmentError("Batch not found", 404);
  }

  if (batch.status === "COMPLETED") {
    throw new AssignmentError("Batch is already completed", 400);
  }

  if (
    !options.ignoreBatchStatus &&
    batch.status !== "OPEN" &&
    batch.status !== "ACTIVE"
  ) {
    throw new AssignmentError(
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
    body.paymentPath === "INSTALLMENT" &&
    !usesCustom &&
    !usesNamedPlan &&
    batch.installmentTemplates.length === 0
  ) {
    throw new AssignmentError(
      "This batch has no payment plan defined. Choose another plan or add custom instalments.",
      400,
    );
  }

  const customCourseFee =
    body.customCourseFee !== undefined && body.customCourseFee !== null
      ? body.customCourseFee
      : undefined;

  if (customCourseFee !== undefined && customCourseFee < 0) {
    throw new AssignmentError("Course fee must be a positive number", 400);
  }

  return prisma.$transaction(async (tx) => {
    if (resolvedModelCode) {
      await tx.student.update({
        where: { id: studentId },
        data: { modelCode: resolvedModelCode },
      });
    }

    const updated = await tx.enrollment.update({
      where: { id: enrollment.id },
      data: {
        batchId: body.batchId,
        status: "ACTIVE",
        customCourseFee: customCourseFee ?? null,
        paymentPath: paymentFields.paymentPath,
        installmentSource: paymentFields.installmentSource,
        paymentPlanId: paymentFields.paymentPlanId,
        regFeePaid: body.regFeePaid ?? false,
        notes: body.notes ?? null,
      },
      select: {
        id: true,
        batchId: true,
        status: true,
        batch: { select: { batchCode: true, name: true } },
      },
    });

    await createEnrollmentInstallments(
      tx,
      buildCreateInstallmentsInput(enrollment.id, body, customCourseFee),
    );

    return {
      enrollmentId: updated.id,
      batchId: updated.batchId!,
      batchCode: updated.batch!.batchCode,
      batchName: updated.batch!.name,
      status: updated.status,
      modelCode: resolvedModelCode ?? undefined,
    };
  });
}
