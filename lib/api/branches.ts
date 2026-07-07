import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  AddClassDayResponse,
  BranchDetail,
  BranchListItem,
  BranchListPage,
  BranchPickerItem,
  CreateBranchBody,
  CreateClassDayBody,
  DeleteClassDayResponse,
  UpdateBranchBody,
} from "@/types/api/branch";

export type BranchListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "active" | "inactive";
  sort?: "name" | "students" | "batches";
};

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}

function buildListQuery(params?: BranchListParams): string {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.search?.trim()) search.set("search", params.search.trim());
  if (params?.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params?.sort) search.set("sort", params.sort);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchBranchPicker(): Promise<BranchPickerItem[]> {
  const res = await adminFetch("/api/branches?view=picker", {
    cache: "no-store",
  });
  return parseResponse<BranchPickerItem[]>(res);
}

export async function fetchBranches(
  params?: BranchListParams,
): Promise<BranchListPage> {
  const res = await adminFetch(`/api/branches${buildListQuery(params)}`, {
    cache: "no-store",
  });
  return parseResponse<BranchListPage>(res);
}

export async function createBranch(
  body: CreateBranchBody,
): Promise<BranchListItem> {
  const res = await adminFetch("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<BranchListItem>(res);
}

export async function fetchBranchDetail(id: string): Promise<BranchDetail> {
  const res = await adminFetch(`/api/branches/${id}`, {
    cache: "no-store",
  });
  return parseResponse<BranchDetail>(res);
}

export async function updateBranch(
  id: string,
  body: UpdateBranchBody,
): Promise<BranchListItem> {
  const res = await adminFetch(`/api/branches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<BranchListItem>(res);
}

export async function addClassDay(
  branchId: string,
  body: CreateClassDayBody,
): Promise<AddClassDayResponse> {
  const res = await adminFetch(`/api/branches/${branchId}/class-days`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<AddClassDayResponse>(res);
}

export async function deleteClassDay(
  branchId: string,
  dayId: string,
): Promise<DeleteClassDayResponse> {
  const res = await adminFetch(`/api/branches/${branchId}/class-days/${dayId}`, {
    method: "DELETE",
    cache: "no-store",
  });
  return parseResponse<DeleteClassDayResponse>(res);
}
