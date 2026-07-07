import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { getReceiptDeliveryContext } from "@/lib/payments/notify-payment-receipts";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/students/[id]/receipt-delivery — email/SMS options for record-payment UI */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: studentId } = await context.params;
  const data = await getReceiptDeliveryContext(studentId);

  if (!data) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
