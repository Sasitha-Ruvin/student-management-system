import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  AddAlumniBody,
  AlumniListItem,
  AlumniListPage,
  GraduateBatchResult,
} from "@/types/api/alumni";

export type AlumniListParams = {
  branchId?: string;
  batchId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as T;
}

function buildListQuery(params?: AlumniListParams): string {
  const search = new URLSearchParams();
  if (params?.branchId && params.branchId !== "all") {
    search.set("branchId", params.branchId);
  }
  if (params?.batchId && params.batchId !== "all") {
    search.set("batchId", params.batchId);
  }
  if (params?.search?.trim()) search.set("search", params.search.trim());
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAlumni(
  params?: AlumniListParams,
): Promise<AlumniListPage> {
  const res = await adminFetch(`/api/alumni${buildListQuery(params)}`, {
    cache: "no-store",
  });
  return parseResponse<AlumniListPage>(res);
}

export async function addAlumni(body: AddAlumniBody): Promise<AlumniListItem> {
  const res = await adminFetch("/api/alumni", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to add alumni");
  }
  return json.data as AlumniListItem;
}

export async function graduateBatch(
  batchId: string,
  graduatedAt: string,
): Promise<GraduateBatchResult> {
  const res = await adminFetch(`/api/batches/${batchId}/graduate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graduatedAt }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to graduate batch");
  }
  return json.data as GraduateBatchResult;
}
