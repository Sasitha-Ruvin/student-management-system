import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { generateSessionDates, isoToDate, toIsoDate } from "@/lib/batches/session-generator";
import { prisma } from "@/lib/prisma";
import type { SessionPreviewItem } from "@/types/api/batch";

const MAX_RANGE_DAYS = 730;

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  if (!branchId || !startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "branchId, startDate and endDate are required" },
      { status: 400 },
    );
  }

  const startDate = isoToDate(startDateParam);
  const endDate = isoToDate(endDateParam);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid startDate or endDate" },
      { status: 400 },
    );
  }

  if (startDate >= endDate) {
    return NextResponse.json(
      { error: "startDate must be before endDate" },
      { status: 400 },
    );
  }

  const rangeDays = (endDate.getTime() - startDate.getTime()) / 86_400_000;
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range exceeds maximum of ${MAX_RANGE_DAYS} days` },
      { status: 400 },
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, isActive: true },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const classDays = await prisma.branchClassDay.findMany({
    where: { branchId },
    select: { dayOfWeek: true },
    orderBy: { dayOfWeek: "asc" },
  });

  if (classDays.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const classDayNumbers = classDays.map((c) => c.dayOfWeek);
  const dates = generateSessionDates(classDayNumbers, startDate, endDate);

  const items: SessionPreviewItem[] = dates.map((d) => {
    const dateIso = toIsoDate(d);
    return {
      date: dateIso,
      // Use Colombo noon for getDay() so the weekday matches the Colombo calendar date
      dayOfWeek: new Date(`${dateIso}T12:00:00+05:30`).getDay(),
      selected: true,
    };
  });

  return NextResponse.json(
    { data: items },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
