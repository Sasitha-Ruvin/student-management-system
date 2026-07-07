import type { BranchListQuery } from "@/lib/branches/branch-list-queries";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parsePageLimit(
  searchParams: URLSearchParams,
  defaultLimit = DEFAULT_LIMIT,
): { page: number; limit: number } {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit")) || defaultLimit),
  );
  return { page, limit };
}

export function parseBranchListParams(
  searchParams: URLSearchParams,
): BranchListQuery {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT),
  );

  const search = searchParams.get("search")?.trim() || undefined;

  const statusParam = searchParams.get("status");
  const status =
    statusParam === "active" || statusParam === "inactive"
      ? statusParam
      : "all";

  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "students" || sortParam === "batches" ? sortParam : "name";

  return {
    page,
    limit,
    search,
    status,
    sort,
  };
}
