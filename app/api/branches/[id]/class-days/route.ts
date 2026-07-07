import { NextResponse } from "next/server";

import { invalidateBranches } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { validateClassDay } from "@/lib/branches/class-day-utils";
import { prisma } from "@/lib/prisma";
import type { AddClassDayResponse, CreateClassDayBody } from "@/types/api/branch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: branchId } = await context.params;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  let body: CreateClassDayBody;
  try {
    body = (await request.json()) as CreateClassDayBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { dayOfWeek } = body;

  if (dayOfWeek === undefined) {
    return NextResponse.json(
      { error: "dayOfWeek is required" },
      { status: 400 },
    );
  }

  const validationError = validateClassDay({ dayOfWeek });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.branchClassDay.findFirst({
    where: { branchId, dayOfWeek },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This day is already added for this branch" },
      { status: 400 },
    );
  }

  const [classDay, scheduledSessionCount] = await Promise.all([
    prisma.branchClassDay.create({
      data: { branchId, dayOfWeek },
    }),
    prisma.session.count({
      where: { branchId, status: "SCHEDULED" },
    }),
  ]);

  invalidateBranches(branchId);

  const data: AddClassDayResponse = {
    classDay: {
      id: classDay.id,
      dayOfWeek: classDay.dayOfWeek,
    },
    hasScheduledSessions: scheduledSessionCount > 0,
  };

  return NextResponse.json({ data }, { status: 201 });
}
