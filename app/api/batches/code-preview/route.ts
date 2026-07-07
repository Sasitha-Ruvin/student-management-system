import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { generateUniqueBatchCode } from "@/lib/batches/batch-code-generator";
import { isoToDate } from "@/lib/batches/session-generator";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId");
  const startDateParam = searchParams.get("startDate");

  if (!branchId || !startDateParam) {
    return NextResponse.json(
      { error: "branchId and startDate are required" },
      { status: 400 },
    );
  }

  const startDate = isoToDate(startDateParam);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { branchCode: true },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const preview = await generateUniqueBatchCode(
    prisma,
    branch.branchCode,
    startDate,
  );

  return NextResponse.json({ data: { preview } });
}
