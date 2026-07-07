import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { fetchSessionDetail } from "@/lib/batches/batch-queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const session = await fetchSessionDetail(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(
    { data: session },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
