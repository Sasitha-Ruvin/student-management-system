import { NextResponse } from "next/server";

import { validatePaymentPlanBody } from "@/lib/api/payment-plan-validation";
import {
  paymentPlanInclude,
  toPaymentPlanDto,
} from "@/lib/api/settings-mappers";
import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import type { UpdatePaymentPlanBody } from "@/types/api/settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: UpdatePaymentPlanBody;
  try {
    body = (await request.json()) as UpdatePaymentPlanBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const existing = await prisma.paymentPlan.findUnique({
    where: { id },
    include: paymentPlanInclude,
  });

  if (!existing) {
    return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });
  }

  const mergedCourseFee =
    body.courseFee !== undefined ? body.courseFee : Number(existing.courseFee);
  const mergedDiscount =
    body.oneTimeDiscountAmount !== undefined
      ? body.oneTimeDiscountAmount
      : Number(existing.oneTimeDiscountAmount);

  const validationError = validatePaymentPlanBody({
    ...body,
    courseFee: mergedCourseFee,
    oneTimeDiscountAmount: mergedDiscount,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let deactivateWarning: string | undefined;
  if (body.isActive === false && existing.isActive) {
    const [batchCount, enrollmentCount] = await Promise.all([
      prisma.batch.count({ where: { paymentPlanId: id } }),
      prisma.enrollment.count({ where: { paymentPlanId: id } }),
    ]);
    if (batchCount > 0 || enrollmentCount > 0) {
      deactivateWarning = `Plan is referenced by ${batchCount} batch(es) and ${enrollmentCount} enrollment(s).`;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.paymentPlan.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    if (body.lineItems !== undefined) {
      await tx.paymentPlanLineItem.deleteMany({ where: { planId: id } });
    }

    const plan = await tx.paymentPlan.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.registrationFee !== undefined && {
          registrationFee: body.registrationFee,
        }),
        ...(body.courseFee !== undefined && { courseFee: body.courseFee }),
        ...(body.oneTimeDiscountAmount !== undefined && {
          oneTimeDiscountAmount: body.oneTimeDiscountAmount,
        }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.lineItems !== undefined && {
          lineItems: {
            create: body.lineItems.map((item) => ({
              label: item.label.trim(),
              amount: item.amount,
              order: item.order,
            })),
          },
        }),
      },
      include: paymentPlanInclude,
    });

    if (plan.isDefault) {
      await tx.academySettings.update({
        where: { id: "default" },
        data: {
          defaultRegistrationFee: plan.registrationFee,
          defaultCourseFee: plan.courseFee,
        },
      });
    }

    return plan;
  });

  invalidateSettings();

  return NextResponse.json({
    data: toPaymentPlanDto(updated),
    ...(deactivateWarning ? { warning: deactivateWarning } : {}),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const existing = await prisma.paymentPlan.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });
  }

  if (existing.isDefault) {
    return NextResponse.json(
      { error: "Cannot delete the default payment plan. Deactivate it instead." },
      { status: 400 },
    );
  }

  const [batchCount, enrollmentCount] = await Promise.all([
    prisma.batch.count({ where: { paymentPlanId: id } }),
    prisma.enrollment.count({ where: { paymentPlanId: id } }),
  ]);

  if (batchCount > 0 || enrollmentCount > 0) {
    return NextResponse.json(
      {
        error: "Payment plan is referenced by batches or enrollments",
        batchCount,
        enrollmentCount,
      },
      { status: 422 },
    );
  }

  await prisma.paymentPlan.delete({ where: { id } });

  invalidateSettings();

  return NextResponse.json({ data: { success: true } });
}
