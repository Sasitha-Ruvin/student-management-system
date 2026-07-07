import { NextResponse } from "next/server";

import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import type { TransferSettlementKind } from "@/app/generated/prisma";
import {
  EnrollmentLifecycleError,
  transferEnrollment,
} from "@/lib/students/enrollment-lifecycle";
import { prisma } from "@/lib/prisma";
import type { EnrollmentAction } from "@/types/api/batch";

type RouteContext = {
  params: Promise<{ id: string; enrollmentId: string }>;
};

const ACTION_STATUS_MAP: Record<string, string> = {
  suspend: "SUSPENDED",
  hold: "ON_HOLD",
  activate: "ACTIVE",
  drop: "DROPPED",
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const { id: batchId, enrollmentId } = await context.params;

  const sourceBatch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { branchId: true },
  });

  let body: EnrollmentAction;
  try {
    body = (await request.json()) as EnrollmentAction;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, batchId: true, status: true, studentId: true },
  });

  if (!enrollment || enrollment.batchId !== batchId) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  if (enrollment.status === "DROPPED" && body.action !== "activate") {
    return NextResponse.json(
      {
        error:
          "This enrollment is dropped. Re-activate here or use Enroll in batch for a new intake.",
      },
      { status: 422 },
    );
  }

  if (enrollment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot modify a completed enrollment." },
      { status: 422 },
    );
  }

  if (body.action === "transfer") {
    if (!body.targetBatchId) {
      return NextResponse.json(
        { error: "targetBatchId is required for transfer" },
        { status: 400 },
      );
    }

    if (!body.paymentPath) {
      return NextResponse.json(
        { error: "paymentPath is required for transfer" },
        { status: 400 },
      );
    }

    try {
      const settlement = body.settlement
        ? {
            kind: body.settlement.kind as TransferSettlementKind,
            amount: body.settlement.amount,
            notes: body.settlement.notes,
          }
        : null;

      const result = await transferEnrollment(enrollmentId, {
        body: {
          batchId: body.targetBatchId,
          paymentPath: body.paymentPath,
          installmentSource: body.installmentSource,
          paymentPlanId: body.paymentPlanId,
          customInstallments: body.customInstallments,
          customCourseFee: body.customCourseFee,
          regFeePaid: body.regFeePaid,
          notes: body.notes,
        },
        recordedById: admin.id,
        settlement,
      });

      invalidateOperationalData({
        batchId,
        branchId: sourceBatch?.branchId,
      });
      invalidateOperationalData({
        batchId: result.newBatchId,
        branchId: result.newBranchId,
      });

      return NextResponse.json({
        data: {
          sourceEnrollmentId: result.sourceEnrollmentId,
          newEnrollmentId: result.newEnrollmentId,
          batchId: result.newBatchId,
          batchCode: result.newBatchCode,
        },
      });
    } catch (e) {
      if (e instanceof EnrollmentLifecycleError) {
        return NextResponse.json({ error: e.message }, { status: e.statusCode });
      }
      throw e;
    }
  }

  const newStatus = ACTION_STATUS_MAP[body.action];

  if (!newStatus) {
    return NextResponse.json(
      { error: `Unknown action: ${body.action}` },
      { status: 400 },
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: newStatus as Parameters<
        typeof prisma.enrollment.update
      >[0]["data"]["status"],
    },
    select: { id: true, status: true },
  });

  invalidateOperationalData({
    batchId,
    branchId: sourceBatch?.branchId,
  });

  return NextResponse.json({
    data: { enrollmentId: updated.id, status: updated.status },
  });
}
