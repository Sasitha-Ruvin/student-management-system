import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { fetchBatchStudents } from "@/lib/batches/batch-queries";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const students = await fetchBatchStudents(id);

  return NextResponse.json(
    { data: students },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
