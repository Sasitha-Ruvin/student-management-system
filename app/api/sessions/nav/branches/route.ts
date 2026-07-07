import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { fetchSessionBranchNav } from "@/lib/sessions/session-nav-queries";
import type { SessionTab } from "@/lib/sessions/session-tab-filter";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tabParam = searchParams.get("tab");
  const tab: SessionTab = tabParam === "completed" ? "completed" : "upcoming";
  const search = searchParams.get("search") ?? undefined;

  const data = await fetchSessionBranchNav(tab, search);

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
