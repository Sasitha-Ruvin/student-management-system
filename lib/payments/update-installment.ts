import type { Prisma } from "@/app/generated/prisma";
import { ensureInstallmentOverdueCharge } from "@/lib/payments/ensure-installment-overdue-charge";
import {
  resolveInstallmentOverdueReferenceDate,
  type OverdueAsOfMode,
} from "@/lib/payments/installment-overdue-reference-date";
import { deriveInstallmentStatusFromState } from "@/lib/payments/replay-installment-state";
import { prisma } from "@/lib/prisma";

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export class UpdateInstallmentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "UpdateInstallmentError";
  }
}

export type UpdateInstallmentInput = {
  dueDate?: string;
  amount?: number;
  label?: string;
  /** Used when due date changes — default payment_date */
  overdueAsOf?: OverdueAsOfMode;
};

export type UpdateInstallmentResult = {
  installmentId: string;
  label: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  overdueCharge: number;
};

export async function updateInstallment(
  installmentId: string,
  input: UpdateInstallmentInput,
): Promise<UpdateInstallmentResult> {
  const hasDueDate = input.dueDate !== undefined;
  const hasAmount = input.amount !== undefined;
  const hasLabel = input.label !== undefined;

  if (!hasDueDate && !hasAmount && !hasLabel) {
    throw new UpdateInstallmentError("No fields to update", 400);
  }

  return prisma.$transaction(async (tx) => {
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
        enrollment: { select: { status: true } },
      },
    });

    if (!current) {
      throw new UpdateInstallmentError("Instalment not found", 404);
    }

    if (current.status === "CANCELLED") {
      throw new UpdateInstallmentError(
        "Cannot edit a cancelled instalment",
        422,
      );
    }

    if (current.status === "PAID" && (hasDueDate || hasAmount)) {
      throw new UpdateInstallmentError(
        "Paid instalments can only have the label updated",
        422,
      );
    }

    const paidAmount = Number(current.paidAmount);
    let nextAmount = Number(current.amount);
    let nextDueDate = current.dueDate;
    let nextLabel = current.label;

    if (hasAmount) {
      const amount = Number(input.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new UpdateInstallmentError("amount must be greater than 0", 400);
      }
      if (amount + 0.001 < paidAmount) {
        throw new UpdateInstallmentError(
          `amount cannot be less than already paid (${paidAmount})`,
          400,
        );
      }
      nextAmount = amount;
    }

    if (hasDueDate) {
      const parsed = new Date(input.dueDate!);
      if (isNaN(parsed.getTime())) {
        throw new UpdateInstallmentError("dueDate must be a valid date", 400);
      }
      nextDueDate = parsed;
    }

    if (hasLabel) {
      const label = input.label?.trim();
      if (!label) {
        throw new UpdateInstallmentError("label cannot be empty", 400);
      }
      nextLabel = label;
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
        label: nextLabel,
        amount: nextAmount,
        dueDate: nextDueDate,
        status: nextStatus,
      },
    });

    if (hasDueDate || hasAmount) {
      const overdueMode: OverdueAsOfMode =
        hasDueDate && input.overdueAsOf === "today" ? "today" : "payment_date";
      const referenceDate = await resolveInstallmentOverdueReferenceDate(
        installmentId,
        overdueMode,
        tx,
      );
      await ensureInstallmentOverdueCharge(
        installmentId,
        referenceDate,
        tx,
      );

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
    }

    const updated = await tx.installment.findUnique({
      where: { id: installmentId },
      select: {
        id: true,
        label: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        overdueCharge: true,
      },
    });

    if (!updated) {
      throw new UpdateInstallmentError("Instalment not found", 404);
    }

    return {
      installmentId: updated.id,
      label: updated.label,
      dueDate: updated.dueDate.toISOString(),
      amount: Number(updated.amount),
      paidAmount: Number(updated.paidAmount),
      status: updated.status,
      overdueCharge: Number(updated.overdueCharge),
    };
  });
}
