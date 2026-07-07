import { NextResponse } from "next/server";

import { validatePaymentPlanBody } from "@/lib/api/payment-plan-validation";
import {
  paymentPlanInclude,
  toPaymentPlanDto,
} from "@/lib/api/settings-mappers";
import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import type {
  CreatePaymentPlanBody,
  PaymentPlanDto,
} from "@/types/api/settings";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const plans = await prisma.paymentPlan.findMany({
    include: paymentPlanInclude,
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });

  const data: PaymentPlanDto[] = plans.map(toPaymentPlanDto);

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: CreatePaymentPlanBody;
  try {
    body = (await request.json()) as CreatePaymentPlanBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const validationError = validatePaymentPlanBody(body, {
    requireName: true,
    requireFees: true,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const maxOrder = await prisma.paymentPlan.aggregate({
    _max: { sortOrder: true },
  });

  const isDefault = body.isDefault ?? false;

  const plan = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.paymentPlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.paymentPlan.create({
      data: {
        name: body.name!.trim(),
        isDefault,
        isActive: body.isActive ?? true,
        registrationFee: body.registrationFee!,
        courseFee: body.courseFee!,
        oneTimeDiscountAmount: body.oneTimeDiscountAmount!,
        sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
        lineItems: {
          create: body.lineItems!.map((item) => ({
            label: item.label.trim(),
            amount: item.amount,
            order: item.order,
          })),
        },
      },
      include: paymentPlanInclude,
    });
  });

  invalidateSettings();

  return NextResponse.json({ data: toPaymentPlanDto(plan) }, { status: 201 });
}
