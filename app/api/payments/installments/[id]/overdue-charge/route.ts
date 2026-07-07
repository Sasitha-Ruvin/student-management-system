import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type WaiveBody = {
  waived: boolean;
};

// PATCH /api/payments/installments/[id]/overdue-charge
export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: WaiveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.waived !== "boolean") {
    return NextResponse.json(
      { error: "waived must be a boolean" },
      { status: 400 },
    );
  }

  const installment = await prisma.installment.findUnique({
    where: { id },
    select: { id: true, overdueCharge: true, status: true },
  });

  if (!installment) {
    return NextResponse.json({ error: "Instalment not found" }, { status: 404 });
  }

  if (Number(installment.overdueCharge) <= 0 && body.waived) {
    return NextResponse.json(
      { error: "This instalment has no overdue charge to waive" },
      { status: 400 },
    );
  }

  await prisma.installment.update({
    where: { id },
    data: {
      overdueChargeWaived: body.waived,
      ...(body.waived ? { overdueChargePaid: 0 } : {}),
    },
  });

  return NextResponse.json({
    data: {
      message: body.waived
        ? "Overdue charge waived"
        : "Overdue charge waiver removed",
    },
  });
}
