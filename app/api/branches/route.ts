import { NextResponse } from "next/server";

import { freshAdminJson } from "@/lib/api/cache-headers";
import {
  getCachedBranchListPage,
  getCachedBranchPicker,
} from "@/lib/api/cached-queries";
import { invalidateBranches } from "@/lib/api/invalidate-cache";
import { parseBranchListParams } from "@/lib/api/parse-list-params";
import { requireAdmin } from "@/lib/api/require-admin";
import { validateClassDays } from "@/lib/branches/class-day-utils";
import { fetchBranchListItemById } from "@/lib/branches/branch-list-queries";
import { generateUniqueBranchCode } from "@/lib/branches/generate-branch-code";
import { prisma } from "@/lib/prisma";
import type { CreateBranchBody } from "@/types/api/branch";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const query = parseBranchListParams(searchParams);

  if (searchParams.get("view") === "picker") {
    const picker = await getCachedBranchPicker();
    return freshAdminJson({ data: picker });
  }

  const page = await getCachedBranchListPage(query);

  return freshAdminJson({ data: page });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: CreateBranchBody;
  try {
    body = (await request.json()) as CreateBranchBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  const location = body.location?.trim();
  const classDays = body.classDays ?? [];

  if (!name || !location) {
    return NextResponse.json(
      { error: "name and location are required" },
      { status: 400 },
    );
  }

  const classDayError = validateClassDays(classDays);
  if (classDayError) {
    return NextResponse.json({ error: classDayError }, { status: 400 });
  }

  const branchCode = await generateUniqueBranchCode(prisma, name);

  const created = await prisma.branch.create({
    data: {
      name,
      location,
      branchCode,
      ...(classDays.length > 0 && {
        classDays: {
          create: classDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
          })),
        },
      }),
    },
    select: { id: true },
  });

  invalidateBranches(created.id);

  const data = await fetchBranchListItemById(created.id);
  if (!data) {
    return NextResponse.json(
      { error: "Branch created but could not load response" },
      { status: 500 },
    );
  }

  return freshAdminJson({ data }, 201);
}
