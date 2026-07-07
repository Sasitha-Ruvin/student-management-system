import { NextResponse } from "next/server";

import { freshAdminJson } from "@/lib/api/cache-headers";
import {
  getCachedBatchListPage,
  getCachedBatchDetail,
} from "@/lib/api/cached-queries";
import { fetchBatchDetail } from "@/lib/batches/batch-queries";
import { invalidateOperationalData } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { createBatchTransaction, MAX_SESSION_DATE_RANGE_DAYS } from "@/lib/batches/batch-create";
import { isoToDate } from "@/lib/batches/session-generator";
import { prisma } from "@/lib/prisma";
import type { BatchListQuery } from "@/lib/batches/batch-queries";
import type { CreateBatchBody } from "@/types/api/batch";

function parseBatchListQuery(searchParams: URLSearchParams): BatchListQuery {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const branchId = searchParams.get("branchId") ?? undefined;
  const search = searchParams.get("search")?.trim() || undefined;

  const statusParam = searchParams.get("status");
  const validStatuses = ["OPEN", "ACTIVE", "COMPLETED"] as const;
  const status = validStatuses.includes(statusParam as (typeof validStatuses)[number])
    ? (statusParam as (typeof validStatuses)[number])
    : "all";

  return { page, limit, branchId, search, status };
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const query = parseBatchListQuery(searchParams);
    const page = await getCachedBatchListPage(query);

    return freshAdminJson({ data: page });
  } catch (err) {
    console.error("[GET /api/batches]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load batches",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: CreateBatchBody;
  try {
    body = (await request.json()) as CreateBatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Basic field validation ────────────────────────────────────────
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.branchId) {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 },
    );
  }
  if (!body.defaultClassTime?.match(/^\d{1,2}:\d{2}$/)) {
    return NextResponse.json(
      { error: "defaultClassTime must be in HH:MM format (e.g. 09:00)" },
      { status: 400 },
    );
  }
  const timePattern = /^\d{1,2}:\d{2}$/;
  if (
    body.defaultClassEndTime &&
    !timePattern.test(body.defaultClassEndTime.trim())
  ) {
    return NextResponse.json(
      { error: "defaultClassEndTime must be in HH:MM format (e.g. 12:00)" },
      { status: 400 },
    );
  }
  if (body.defaultClassEndTime?.trim()) {
    const [sh, sm] = body.defaultClassTime.split(":").map(Number);
    const [eh, em] = body.defaultClassEndTime.trim().split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      return NextResponse.json(
        { error: "defaultClassEndTime must be after defaultClassTime" },
        { status: 400 },
      );
    }
  }
  if (typeof body.registrationFee !== "number" || body.registrationFee < 0) {
    return NextResponse.json({ error: "registrationFee must be a non-negative number" }, { status: 400 });
  }
  if (typeof body.courseFee !== "number" || body.courseFee < 0) {
    return NextResponse.json({ error: "courseFee must be a non-negative number" }, { status: 400 });
  }

  const startDate = isoToDate(body.startDate);
  const endDate = isoToDate(body.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid startDate or endDate" }, { status: 400 });
  }
  if (startDate >= endDate) {
    return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
  }

  const rangeDays = (endDate.getTime() - startDate.getTime()) / 86_400_000;
  if (rangeDays > MAX_SESSION_DATE_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range exceeds maximum of ${MAX_SESSION_DATE_RANGE_DAYS} days` },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.confirmedSessions) ||
    body.confirmedSessions.length === 0
  ) {
    return NextResponse.json(
      { error: "confirmedSessions must have at least one session" },
      { status: 400 },
    );
  }

  for (const sess of body.confirmedSessions) {
    if (!sess.date?.trim()) {
      return NextResponse.json(
        { error: "Each session must have a date" },
        { status: 400 },
      );
    }
    if (sess.classTime && !timePattern.test(sess.classTime)) {
      return NextResponse.json(
        { error: "Session classTime must be HH:MM" },
        { status: 400 },
      );
    }
    if (sess.classEndTime && !timePattern.test(sess.classEndTime)) {
      return NextResponse.json(
        { error: "Session classEndTime must be HH:MM" },
        { status: 400 },
      );
    }
  }

  if (!Array.isArray(body.installments) || body.installments.length === 0) {
    return NextResponse.json(
      { error: "At least one installment is required" },
      { status: 400 },
    );
  }

  for (const inst of body.installments) {
    if (!inst.label?.trim()) {
      return NextResponse.json({ error: "Each installment must have a label" }, { status: 400 });
    }
    if (typeof inst.amount !== "number" || inst.amount <= 0) {
      return NextResponse.json({ error: "Each installment amount must be positive" }, { status: 400 });
    }
    if (!inst.dueDate) {
      return NextResponse.json({ error: "Each installment must have a dueDate" }, { status: 400 });
    }
  }

  // ── Branch validation ─────────────────────────────────────────────
  const branch = await prisma.branch.findUnique({
    where: { id: body.branchId },
    select: { id: true, branchCode: true, isActive: true },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  if (!branch.isActive) {
    return NextResponse.json(
      { error: "Cannot create a batch for an inactive branch" },
      { status: 422 },
    );
  }

  // ── Branch must have at least one class day if we'll preview sessions ──
  const classDay = await prisma.branchClassDay.findFirst({
    where: { branchId: body.branchId },
  });
  if (!classDay) {
    return NextResponse.json(
      { error: "Branch has no class days configured. Add class days before creating a batch." },
      { status: 422 },
    );
  }

  // ── PaymentPlan validation ────────────────────────────────────────
  if (body.paymentPlanId) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: body.paymentPlanId },
      select: { id: true, isActive: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Payment plan not found" }, { status: 404 });
    }
    if (!plan.isActive) {
      return NextResponse.json({ error: "Payment plan is inactive" }, { status: 422 });
    }
  }

  // ── Create ────────────────────────────────────────────────────────
  let result;
  try {
    result = await createBatchTransaction(prisma, body, branch);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create batch" },
      { status: 422 },
    );
  }

  invalidateOperationalData({ branchId: body.branchId });

  const detail = await fetchBatchDetail(result.batchId);

  const extraHeaders: Record<string, string> = {};
  if (result.feeMismatch) {
    extraHeaders["X-Fee-Warning"] = "installments-do-not-match-course-fee";
  }

  return NextResponse.json({ data: detail }, { status: 201, headers: extraHeaders });
}
