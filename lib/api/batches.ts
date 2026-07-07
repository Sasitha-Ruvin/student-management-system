import { adminFetch } from "@/lib/api/admin-fetch";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type {
  AttendanceGrid,
  BatchDetail,
  BatchFinanceSummary,
  BatchListPage,
  BatchSessionRow,
  BatchStudentRow,
  TransferBalancePreview,
  CreateBatchBody,
  CreateSessionBody,
  CreateSessionResult,
  EnrollmentAction,
  SessionPreviewItem,
  UpdateAttendanceCellBody,
  UpdateBatchBody,
  UpdateBatchResult,
  UpdateBatchInstallmentTemplatesBody,
  UpdateBatchInstallmentTemplatesResult,
  UpdateSessionAction,
  SessionEditResult,
} from "@/types/api/batch";

export type BatchListParams = {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: "all" | "OPEN" | "ACTIVE" | "COMPLETED";
  search?: string;
};

export type FetchBatchesOptions = {
  signal?: AbortSignal;
};

function buildListQuery(params?: BatchListParams): string {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.branchId && params.branchId !== "all") {
    search.set("branchId", params.branchId);
  }
  if (params?.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params?.search?.trim()) search.set("search", params.search.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchBatches(
  params?: BatchListParams,
  options?: FetchBatchesOptions,
): Promise<BatchListPage> {
  const res = await adminFetch(`/api/batches${buildListQuery(params)}`, {
    cache: "no-store",
    signal: options?.signal,
  });
  return parseJsonResponse<BatchListPage>(res);
}

export async function fetchBatchDetail(id: string): Promise<BatchDetail> {
  const res = await adminFetch(`/api/batches/${id}`, { cache: "no-store" });
  return parseJsonResponse<BatchDetail>(res);
}

export async function createBatch(
  body: CreateBatchBody,
): Promise<{ detail: BatchDetail; feeWarning: boolean }> {
  const res = await adminFetch("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to create batch");
  }
  return {
    detail: json.data as BatchDetail,
    feeWarning: res.headers.get("X-Fee-Warning") === "installments-do-not-match-course-fee",
  };
}

export async function deleteBatch(id: string): Promise<void> {
  const res = await adminFetch(`/api/batches/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to delete batch");
  }
}

export async function cancelBatch(id: string): Promise<{
  droppedEnrollmentCount: number;
  batch: BatchDetail;
}> {
  const res = await adminFetch(`/api/batches/${id}/cancel`, {
    method: "POST",
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to cancel batch");
  }
  return {
    droppedEnrollmentCount: json.data.droppedEnrollmentCount as number,
    batch: json.data.batch as BatchDetail,
  };
}

export async function graduateBatch(
  id: string,
  graduatedAt: string,
): Promise<{
  promotedCount: number;
  alumniIds: string[];
  batch: BatchDetail;
}> {
  const res = await adminFetch(`/api/batches/${id}/graduate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ graduatedAt }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to graduate batch");
  }
  return {
    promotedCount: json.data.promotedCount as number,
    alumniIds: json.data.alumniIds as string[],
    batch: json.data.batch as BatchDetail,
  };
}

export async function updateBatch(
  id: string,
  body: UpdateBatchBody,
): Promise<UpdateBatchResult> {
  const res = await adminFetch(`/api/batches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to update batch");
  }
  return {
    batch: json.data as BatchDetail,
    warnings: json.warnings as string[] | undefined,
  };
}

export async function updateBatchInstallmentTemplates(
  batchId: string,
  body: UpdateBatchInstallmentTemplatesBody,
): Promise<UpdateBatchInstallmentTemplatesResult> {
  const res = await adminFetch(`/api/batches/${batchId}/installment-templates`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to update instalment schedule");
  }
  return json.data as UpdateBatchInstallmentTemplatesResult;
}

export async function fetchBatchCodePreview(
  branchId: string,
  startDate: string,
): Promise<string> {
  const params = new URLSearchParams({ branchId, startDate });
  const res = await adminFetch(`/api/batches/code-preview?${params}`, {
    cache: "no-store",
  });
  const data = await parseJsonResponse<{ preview: string }>(res);
  return data.preview;
}

export async function fetchSessionPreview(
  branchId: string,
  startDate: string,
  endDate: string,
): Promise<SessionPreviewItem[]> {
  const params = new URLSearchParams({ branchId, startDate, endDate });
  const res = await adminFetch(`/api/batches/session-preview?${params}`, {
    cache: "no-store",
  });
  return parseJsonResponse<SessionPreviewItem[]>(res);
}

export async function fetchBatchStudents(batchId: string): Promise<BatchStudentRow[]> {
  const res = await adminFetch(`/api/batches/${batchId}/students`, { cache: "no-store" });
  return parseJsonResponse<BatchStudentRow[]>(res);
}

export async function fetchTransferBalancePreview(
  batchId: string,
  enrollmentId: string,
): Promise<TransferBalancePreview> {
  const res = await adminFetch(
    `/api/batches/${batchId}/students/${enrollmentId}/transfer-preview`,
    { cache: "no-store" },
  );
  return parseJsonResponse<TransferBalancePreview>(res);
}

export async function updateEnrollment(
  batchId: string,
  enrollmentId: string,
  action: EnrollmentAction,
): Promise<void> {
  const res = await adminFetch(`/api/batches/${batchId}/students/${enrollmentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
    cache: "no-store",
  });
  await parseJsonResponse<unknown>(res);
}

export async function fetchBatchSessions(batchId: string): Promise<BatchSessionRow[]> {
  const res = await adminFetch(`/api/batches/${batchId}/sessions`, { cache: "no-store" });
  return parseJsonResponse<BatchSessionRow[]>(res);
}

export async function createExtraSession(
  batchId: string,
  body: CreateSessionBody,
): Promise<CreateSessionResult> {
  const res = await adminFetch(`/api/batches/${batchId}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as {
    data?: BatchSessionRow;
    error?: string;
    smsResult?: CreateSessionResult["smsResult"];
    warning?: string;
    warnings?: string[];
    smsWarning?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  if (!json.data) {
    throw new Error("Invalid response from server");
  }
  return {
    session: json.data,
    smsResult: json.smsResult,
    warning: json.warning,
    warnings: json.warnings,
    smsWarning: json.smsWarning,
  };
}

export async function updateSession(
  batchId: string,
  sessionId: string,
  body: UpdateSessionAction,
): Promise<SessionEditResult | void> {
  const res = await adminFetch(`/api/batches/${batchId}/sessions/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  if (
    body.action === "edit" ||
    body.action === "reschedule" ||
    body.action === "cancel"
  ) {
    return json.data as SessionEditResult;
  }
}

export async function bulkRescheduleSessions(
  batchId: string,
  fromDate: string,
  pushDays: number,
  options?: {
    notifyStudents?: boolean;
    studentMessage?: string;
    templateId?: string | null;
  },
): Promise<{ updatedCount: number; smsResult?: SessionEditResult["smsResult"]; warning?: string }> {
  const res = await adminFetch(`/api/batches/${batchId}/sessions/bulk-reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromDate,
      pushDays,
      notifyStudents: options?.notifyStudents,
      studentMessage: options?.studentMessage,
      templateId: options?.templateId,
    }),
    cache: "no-store",
  });
  const data = await parseJsonResponse<{
    updatedCount: number;
    smsResult?: SessionEditResult["smsResult"];
    warning?: string;
  }>(res);
  return data;
}

export async function fetchAttendanceGrid(batchId: string): Promise<AttendanceGrid> {
  const res = await adminFetch(`/api/batches/${batchId}/attendance`, {
    cache: "no-store",
  });
  return parseJsonResponse<AttendanceGrid>(res);
}

export async function updateAttendanceCell(
  batchId: string,
  body: UpdateAttendanceCellBody,
): Promise<void> {
  const res = await adminFetch(`/api/batches/${batchId}/attendance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  await parseJsonResponse<unknown>(res);
}

export async function fetchBatchFinance(
  batchId: string,
): Promise<BatchFinanceSummary> {
  const res = await adminFetch(`/api/batches/${batchId}/finance`, { cache: "no-store" });
  return parseJsonResponse<BatchFinanceSummary>(res);
}
