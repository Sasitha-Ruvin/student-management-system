import { NextResponse } from "next/server";

import { getCachedBranchDetail } from "@/lib/api/cached-queries";
import { requireAdmin } from "@/lib/api/require-admin";
import { assertCanDeactivateBranch } from "@/lib/branches/branch-deactivation";
import { deactivationBlockedMessage } from "@/lib/branches/deactivation-messages";
import { fetchBranchListItemById } from "@/lib/branches/branch-list-queries";
import { invalidateBranches } from "@/lib/api/invalidate-cache";
import { prisma } from "@/lib/prisma";
import type { UpdateBranchBody } from "@/types/api/branch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const data = await getCachedBranchDetail(id);

  if (!data) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: UpdateBranchBody;
  try {
    body = (await request.json()) as UpdateBranchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { name, location, isActive } = body;

  if (
    name === undefined &&
    location === undefined &&
    isActive === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field is required" },
      { status: 400 },
    );
  }

  const existing = await prisma.branch.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  if (isActive === false && existing.isActive) {
    const guard = await assertCanDeactivateBranch(id);
    if (!guard.ok) {
      return NextResponse.json(
        { error: deactivationBlockedMessage(guard.activeStudentCount) },
        { status: 422 },
      );
    }
  }

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }
  if (location !== undefined && !location.trim()) {
    return NextResponse.json(
      { error: "location cannot be empty" },
      { status: 400 },
    );
  }

  await prisma.branch.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location: location.trim() }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  invalidateBranches(id);

  const data = await fetchBranchListItemById(id);
  if (!data) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
