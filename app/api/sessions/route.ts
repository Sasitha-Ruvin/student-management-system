import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { getCachedSessionListPage } from "@/lib/api/cached-queries";
import type { SessionListQuery } from "@/types/api/batch";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "completed" ? "completed" : ("upcoming" as const);

  const query: SessionListQuery = {
    page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : 20,
    tab,
    branchId: searchParams.get("branchId") ?? undefined,
    batchId: searchParams.get("batchId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  };

  const result = await getCachedSessionListPage(query);

  return NextResponse.json(
    { data: result },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
