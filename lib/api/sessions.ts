import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  MarkAttendanceBody,
  SessionBatchNavItem,
  SessionBranchNavItem,
  SessionDetail,
  SessionListPage,
  SessionListQuery,
  SessionStudentSearchResult,
} from "@/types/api/batch";
import type { SessionTab } from "@/lib/sessions/session-tab-filter";

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as T;
}

function buildListQuery(params?: SessionListQuery): string {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.tab) search.set("tab", params.tab);
  if (params?.branchId) search.set("branchId", params.branchId);
  if (params?.batchId) search.set("batchId", params.batchId);
  if (params?.search?.trim()) search.set("search", params.search.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function buildNavQuery(tab: SessionTab, search?: string): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (search?.trim()) params.set("search", search.trim());
  return `?${params.toString()}`;
}

export async function fetchSessionBranchNav(
  tab: SessionTab,
  search?: string,
): Promise<SessionBranchNavItem[]> {
  const res = await adminFetch(
    `/api/sessions/nav/branches${buildNavQuery(tab, search)}`,
    { cache: "no-store" },
  );
  return parseResponse<SessionBranchNavItem[]>(res);
}

export async function fetchSessionBatchNav(
  branchId: string,
  tab: SessionTab,
  search?: string,
): Promise<SessionBatchNavItem[]> {
  const params = new URLSearchParams(buildNavQuery(tab, search).slice(1));
  params.set("branchId", branchId);
  const res = await adminFetch(`/api/sessions/nav/batches?${params.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<SessionBatchNavItem[]>(res);
}

export async function fetchSessions(
  params?: SessionListQuery,
): Promise<SessionListPage> {
  const res = await adminFetch(`/api/sessions${buildListQuery(params)}`, {
    cache: "no-store",
  });
  return parseResponse<SessionListPage>(res);
}

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  const res = await adminFetch(`/api/sessions/${id}`, { cache: "no-store" });
  return parseResponse<SessionDetail>(res);
}

export async function markSessionAttendance(
  sessionId: string,
  body: MarkAttendanceBody,
): Promise<void> {
  const res = await adminFetch(`/api/sessions/${sessionId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  await parseResponse<unknown>(res);
}

export async function deleteSessionAttendance(
  sessionId: string,
  attendanceId: string,
): Promise<void> {
  const res = await adminFetch(
    `/api/sessions/${sessionId}/attendance/${attendanceId}`,
    { method: "DELETE", cache: "no-store" },
  );
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? "Request failed");
  }
}

export async function searchSessionStudents(
  sessionId: string,
  q: string,
): Promise<SessionStudentSearchResult[]> {
  const res = await adminFetch(
    `/api/sessions/${sessionId}/attendance/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
  );
  return parseResponse<SessionStudentSearchResult[]>(res);
}
