import type { Prisma } from "@/app/generated/prisma";
import { isoToDate } from "@/lib/batches/session-generator";
import { ensureInstallmentOverdueCharge } from "@/lib/payments/ensure-installment-overdue-charge";
import {
  resolveInstallmentOverdueReferenceDate,
} from "@/lib/payments/installment-overdue-reference-date";
import { deriveInstallmentStatusFromState } from "@/lib/payments/replay-installment-state";
import { prisma } from "@/lib/prisma";
import type { InstallmentInput } from "@/types/api/batch";

export class UpdateBatchInstallmentTemplatesError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "UpdateBatchInstallmentTemplatesError";
  }
}

export type UpdateBatchInstallmentTemplatesInput = {
  batchId: string;
  templates: InstallmentInput[];
  applyToExisting: boolean;
};

export type SkippedInstallmentSync = {
  enrollmentId: string;
  installmentId: string;
  order: number;
  reason: "PAID_OR_PARTIAL" | "CANCELLED" | "NOT_FOUND";
};

export type UpdateBatchInstallmentTemplatesResult = {
  templateCount: number;
  feeMismatch: boolean;
  dueDatesUpdated: number;
  amountsUpdated: number;
  labelsUpdated: number;
  skipped: SkippedInstallmentSync[];
};

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function validateTemplates(templates: InstallmentInput[]): void {
  if (templates.length === 0) {
    throw new UpdateBatchInstallmentTemplatesError(
      "At least one instalment is required",
      400,
    );
  }

  const orders = new Set<number>();
  for (const t of templates) {
    if (!t.label?.trim()) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Each instalment must have a label",
        400,
      );
    }
    if (typeof t.amount !== "number" || t.amount <= 0) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Each instalment amount must be positive",
        400,
      );
    }
    if (!t.dueDate) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Each instalment must have a due date",
        400,
      );
    }
    const due = isoToDate(t.dueDate);
    if (isNaN(due.getTime())) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Invalid due date in instalment",
        400,
      );
    }
    if (orders.has(t.order)) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Duplicate instalment order values",
        400,
      );
    }
    orders.add(t.order);
  }
}

async function syncInstallmentDueDateAndFields(
  tx: Prisma.TransactionClient,
  installmentId: string,
  template: { label: string; amount: number; dueDate: Date },
  allowAmountChange: boolean,
): Promise<"due" | "amount" | "label" | "skipped"> {
  const current = await tx.installment.findUnique({
    where: { id: installmentId },
    select: {
      id: true,
      label: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      status: true,
      overdueCharge: true,
      overdueChargePaid: true,
      overdueChargeWaived: true,
    },
  });

  if (!current) return "skipped";
  if (current.status === "CANCELLED") return "skipped";

  const paidAmount = Number(current.paidAmount);
  const canChangeAmount = allowAmountChange && paidAmount < 0.001;

  let nextAmount = Number(current.amount);
  let nextLabel = current.label;
  const nextDueDate = template.dueDate;

  if (canChangeAmount) {
    nextAmount = template.amount;
    nextLabel = template.label.trim();
  } else if (paidAmount > 0.001) {
    nextLabel = template.label.trim();
  }

  const balanceInput = {
    amount: nextAmount,
    paidAmount,
    overdueCharge: Number(current.overdueCharge),
    overdueChargePaid: Number(current.overdueChargePaid),
    overdueChargeWaived: current.overdueChargeWaived,
  };

  const nextStatus = deriveInstallmentStatusFromState(
    balanceInput,
    nextDueDate,
    current.status,
  );

  await tx.installment.update({
    where: { id: installmentId },
    data: {
      dueDate: nextDueDate,
      status: nextStatus,
      ...(canChangeAmount ? { amount: nextAmount, label: nextLabel } : { label: nextLabel }),
    },
  });

  const referenceDate = await resolveInstallmentOverdueReferenceDate(
    installmentId,
    "payment_date",
    tx,
  );
  await ensureInstallmentOverdueCharge(installmentId, referenceDate, tx);

  const refDay = startOfDay(referenceDate);
  const dueDay = startOfDay(nextDueDate);
  if (refDay <= dueDay) {
    const after = await tx.installment.findUnique({
      where: { id: installmentId },
      select: { overdueChargePaid: true, overdueCharge: true },
    });
    if (
      after &&
      Number(after.overdueChargePaid) < 0.001 &&
      Number(after.overdueCharge) > 0
    ) {
      await tx.installment.update({
        where: { id: installmentId },
        data: {
          overdueCharge: 0,
          overdueChargeAppliedAt: null,
        },
      });
    }
  }

  if (canChangeAmount && nextAmount !== Number(current.amount)) return "amount";
  if (nextDueDate.getTime() !== current.dueDate.getTime()) return "due";
  if (nextLabel !== current.label) return "label";
  return "skipped";
}

export async function updateBatchInstallmentTemplates(
  input: UpdateBatchInstallmentTemplatesInput,
): Promise<UpdateBatchInstallmentTemplatesResult> {
  validateTemplates(input.templates);

  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
    select: {
      id: true,
      status: true,
      courseFee: true,
      branchId: true,
      installmentTemplates: { select: { id: true, order: true } },
    },
  });

  if (!batch) {
    throw new UpdateBatchInstallmentTemplatesError("Batch not found", 404);
  }

  if (batch.status === "COMPLETED" || batch.status === "CLOSED") {
    throw new UpdateBatchInstallmentTemplatesError(
      "Cannot edit instalment schedule for a completed or closed batch",
      422,
    );
  }

  const newOrders = new Set(input.templates.map((t) => t.order));
  const removedOrders = batch.installmentTemplates
    .map((t) => t.order)
    .filter((order) => !newOrders.has(order));

  if (removedOrders.length > 0) {
    const paidOnRemoved = await prisma.installment.findFirst({
      where: {
        order: { in: removedOrders },
        paidAmount: { gt: 0 },
        enrollment: {
          batchId: input.batchId,
          installmentSource: "BATCH",
          status: { notIn: ["DROPPED", "UNASSIGNED"] },
        },
      },
      select: { id: true },
    });
    if (paidOnRemoved) {
      throw new UpdateBatchInstallmentTemplatesError(
        "Cannot remove an instalment line that has recorded payments",
        422,
      );
    }
  }

  const installmentSum = input.templates.reduce((s, t) => s + t.amount, 0);
  const courseFee = Number(batch.courseFee);
  const feeMismatch = Math.abs(installmentSum - courseFee) > 0.01;

  const skipped: SkippedInstallmentSync[] = [];
  let dueDatesUpdated = 0;
  let amountsUpdated = 0;
  let labelsUpdated = 0;

  await prisma.$transaction(async (tx) => {
    await tx.installmentTemplate.deleteMany({ where: { batchId: input.batchId } });

    await tx.installmentTemplate.createMany({
      data: input.templates.map((t) => ({
        batchId: input.batchId,
        label: t.label.trim(),
        amount: t.amount,
        dueDate: isoToDate(t.dueDate),
        order: t.order,
      })),
    });

    if (!input.applyToExisting) return;

    const enrollments = await tx.enrollment.findMany({
      where: {
        batchId: input.batchId,
        installmentSource: "BATCH",
        status: { notIn: ["DROPPED", "UNASSIGNED"] },
      },
      select: {
        id: true,
        installments: {
          select: { id: true, order: true, paidAmount: true, status: true },
        },
      },
    });

    const templateByOrder = new Map(
      input.templates.map((t) => [
        t.order,
        {
          label: t.label.trim(),
          amount: t.amount,
          dueDate: isoToDate(t.dueDate),
        },
      ]),
    );

    for (const enrollment of enrollments) {
      for (const [order, template] of templateByOrder) {
        const inst = enrollment.installments.find((i) => i.order === order);
        if (!inst) {
          skipped.push({
            enrollmentId: enrollment.id,
            installmentId: "",
            order,
            reason: "NOT_FOUND",
          });
          continue;
        }

        if (inst.status === "CANCELLED") {
          skipped.push({
            enrollmentId: enrollment.id,
            installmentId: inst.id,
            order,
            reason: "CANCELLED",
          });
          continue;
        }

        const paid = Number(inst.paidAmount);
        const allowAmount = paid < 0.001;

        if (!allowAmount && paid > 0.001) {
          const result = await syncInstallmentDueDateAndFields(
            tx,
            inst.id,
            template,
            false,
          );
          if (result === "due") dueDatesUpdated += 1;
          else if (result === "label") labelsUpdated += 1;
          skipped.push({
            enrollmentId: enrollment.id,
            installmentId: inst.id,
            order,
            reason: "PAID_OR_PARTIAL",
          });
          continue;
        }

        const result = await syncInstallmentDueDateAndFields(
          tx,
          inst.id,
          template,
          true,
        );
        if (result === "due") dueDatesUpdated += 1;
        else if (result === "amount") amountsUpdated += 1;
        else if (result === "label") labelsUpdated += 1;
      }
    }
  });

  return {
    templateCount: input.templates.length,
    feeMismatch,
    dueDatesUpdated,
    amountsUpdated,
    labelsUpdated,
    skipped,
  };
}
