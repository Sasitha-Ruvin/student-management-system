import type { PrismaClient } from "@/app/generated/prisma";

export type BatchTemplateDueDate = {
  lineItemOrder: number;
  dueDate: Date;
};

/**
 * Copies a payment plan's line items into batch installment templates.
 * Admin supplies due dates per line item (manual per batch).
 */
export async function copyPaymentPlanToBatchTemplates(
  prisma: PrismaClient,
  planId: string,
  batchId: string,
  dueDates: BatchTemplateDueDate[],
): Promise<void> {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: planId },
    include: { lineItems: { orderBy: { order: "asc" } } },
  });

  if (!plan) {
    throw new Error("Payment plan not found");
  }

  if (plan.lineItems.length === 0) {
    throw new Error("Payment plan has no installment line items");
  }

  const dueDateByOrder = new Map(
    dueDates.map((entry) => [entry.lineItemOrder, entry.dueDate]),
  );

  await prisma.$transaction([
    prisma.installmentTemplate.deleteMany({ where: { batchId } }),
    prisma.batch.update({
      where: { id: batchId },
      data: {
        paymentPlanId: planId,
        registrationFee: plan.registrationFee,
        courseFee: plan.courseFee,
      },
    }),
    ...plan.lineItems.map((item) => {
      const dueDate = dueDateByOrder.get(item.order);
      if (!dueDate) {
        throw new Error(
          `Missing due date for installment line order ${item.order}`,
        );
      }
      return prisma.installmentTemplate.create({
        data: {
          batchId,
          label: item.label,
          amount: item.amount,
          dueDate,
          order: item.order,
        },
      });
    }),
  ]);
}
