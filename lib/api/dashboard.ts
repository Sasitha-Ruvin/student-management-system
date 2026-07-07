import { adminFetch } from "@/lib/api/admin-fetch";
import type { DashboardStats } from "@/types/api/dashboard";

export async function fetchDashboardStats(
  branchId?: string | null,
): Promise<DashboardStats> {
  const search = new URLSearchParams();
  if (branchId) search.set("branchId", branchId);

  const qs = search.toString();
  const res = await adminFetch(`/api/dashboard/stats${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Failed to load dashboard",
    );
  }

  const json = (await res.json()) as { data: DashboardStats };
  return json.data;
}
