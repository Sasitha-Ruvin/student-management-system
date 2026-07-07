import type {
  EnrollmentInstallmentSource,
  EnrollmentPaymentPath,
  Prisma,
  PrismaClient,
} from "@/app/generated/prisma";

import type { CustomInstallmentInput } from "@/types/api/student";

export type CreateEnrollmentInstallmentsInput = {
  enrollmentId: string;
  batchId: string;
  paymentPath: EnrollmentPaymentPath;
  installmentSource?: EnrollmentInstallmentSource;
  paymentPlanId?: string | null;
  customInstallments?: CustomInstallmentInput[];
  customCourseFee?: number;
};

type Tx = PrismaClient | Prisma.TransactionClient;

function resolveInstallmentSource(
  paymentPath: EnrollmentPaymentPath,
  installmentSource?: EnrollmentInstallmentSource,
  customInstallments?: CustomInstallmentInput[],
  paymentPlanId?: string | null,
): EnrollmentInstallmentSource {
  if (paymentPath === "ONE_TIME") return "BATCH";
  if (customInstallments && customInstallments.length > 0) return "CUSTOM";
  if (paymentPlanId) return "NAMED_PLAN";
  return installmentSource ?? "BATCH";
}

async function resolveOneTimeDiscount(
  client: Tx,
  batch: {
    paymentPlanId: string | null;
    paymentPlan: { oneTimeDiscountAmount: unknown } | null;
  },
  overridePlanId?: string | null,
): Promise<number> {
  if (overridePlanId) {
    const plan = await client.paymentPlan.findUnique({
      where: { id: overridePlanId, isActive: true },
      select: { oneTimeDiscountAmount: true },
    });
    if (plan) return Number(plan.oneTimeDiscountAmount);
  }

  let discount = Number(batch.paymentPlan?.oneTimeDiscountAmount ?? 0);
  if (discount === 0 && !batch.paymentPlanId) {
    const defaultPlan = await client.paymentPlan.findFirst({
      where: { isDefault: true, isActive: true },
      select: { oneTimeDiscountAmount: true },
    });
    discount = Number(defaultPlan?.oneTimeDiscountAmount ?? 0);
  }
  return discount;
}

/**
 * Creates installment rows for an enrollment based on payment path and structure source.
 */
export async function createEnrollmentInstallments(
  prisma: Tx,
  input: CreateEnrollmentInstallmentsInput,
): Promise<EnrollmentInstallmentSource> {
  const client = prisma as PrismaClient;
  const {
    enrollmentId,
    batchId,
    paymentPath,
    customCourseFee,
    customInstallments,
    paymentPlanId,
  } = input;

  const source = resolveInstallmentSource(
    paymentPath,
    input.installmentSource,
    customInstallments,
    paymentPlanId,
  );

  const batch = await client.batch.findUnique({
    where: { id: batchId },
    include: {
      installmentTemplates: { orderBy: { order: "asc" } },
      paymentPlan: true,
    },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const batchCourseFee = Number(batch.courseFee);
  const effectiveCourseFee = customCourseFee ?? batchCourseFee;

  const discount = await resolveOneTimeDiscount(
    client,
    batch,
    source === "NAMED_PLAN" ? paymentPlanId : null,
  );

  if (paymentPath === "ONE_TIME") {
    const upfrontAmount = Math.max(0, effectiveCourseFee - discount);
    await client.installment.create({
      data: {
        enrollmentId,
        label: "One-time course payment",
        amount: upfrontAmount,
        dueDate: batch.startDate,
        order: 0,
      },
    });
    return "BATCH";
  }

  if (source === "CUSTOM") {
    const lines = customInstallments ?? [];
    if (lines.length === 0) {
      throw new Error("At least one custom installment is required");
    }
    await client.installment.createMany({
      data: lines.map((line, index) => ({
        enrollmentId,
        label: line.label.trim() || `Instalment ${index + 1}`,
        amount: line.amount,
        dueDate: new Date(line.dueDate),
        order: line.order ?? index,
      })),
    });
    return "CUSTOM";
  }

  if (source === "NAMED_PLAN") {
    if (!paymentPlanId) {
      throw new Error("paymentPlanId is required for named plan installments");
    }
    const plan = await client.paymentPlan.findUnique({
      where: { id: paymentPlanId, isActive: true },
      include: { lineItems: { orderBy: { order: "asc" } } },
    });
    if (!plan || plan.lineItems.length === 0) {
      throw new Error("Payment plan not found or has no installment lines");
    }

    const planCourseFee = Number(plan.courseFee);
    const scaleFactor =
      customCourseFee !== undefined && planCourseFee > 0
        ? customCourseFee / planCourseFee
        : 1;

    await client.installment.createMany({
      data: plan.lineItems.map((item) => ({
        enrollmentId,
        label: item.label,
        amount: Number(item.amount) * scaleFactor,
        dueDate: batch.startDate,
        order: item.order,
      })),
    });
    return "NAMED_PLAN";
  }

  if (batch.installmentTemplates.length === 0) {
    throw new Error("Batch has no installment templates");
  }

  const scaleFactor =
    customCourseFee !== undefined && batchCourseFee > 0
      ? customCourseFee / batchCourseFee
      : 1;

  await client.installment.createMany({
    data: batch.installmentTemplates.map((template) => ({
      enrollmentId,
      label: template.label,
      amount: Number(template.amount) * scaleFactor,
      dueDate: template.dueDate,
      order: template.order,
    })),
  });

  return "BATCH";
}
