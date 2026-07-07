import { freshAdminJson } from "@/lib/api/cache-headers";
import { requireAdmin } from "@/lib/api/require-admin";
import { getCachedDashboardStats } from "@/lib/api/cached-queries";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const branchId = new URL(request.url).searchParams.get("branchId");
  const stats = await getCachedDashboardStats(
    branchId && branchId !== "all" ? branchId : undefined,
  );

  return freshAdminJson({ data: stats });
}
