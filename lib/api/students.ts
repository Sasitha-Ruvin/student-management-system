import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  AssignBatchBody,
  CreatePortalAccountBody,
  DisablePortalAccountBody,
  PortalAccountActionResult,
  SetPortalPasswordBody,
  EnrollBatchBody,
  StudentDetail,
  StudentDocumentItem,
  StudentListItem,
  StudentListPage,
  StudentListQuery,
  UpdateStudentBody,
  UpdateStudentResult,
} from "@/types/api/student";

export type StudentListParams = StudentListQuery;

export type CreateStudentResult = {
  student: StudentDetail;
  warnings?: string[];
};

export type AssignStudentResult = {
  enrollmentId: string;
  batchId: string;
  batchCode: string;
  batchName: string;
  status: string;
  modelCode?: string;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      field?: string;
      errors?: Record<string, string>;
    };
    if (json.field) err.field = json.field;
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data as T;
}

function buildListQuery(params?: StudentListParams): string {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.search?.trim()) search.set("search", params.search.trim());
  if (params?.listTab) {
    search.set("listTab", params.listTab);
  }
  if (params?.enrollmentStatus && params.enrollmentStatus !== "all") {
    search.set("enrollmentStatus", params.enrollmentStatus);
  }
  if (params?.branchId && params.branchId !== "all") {
    search.set("branchId", params.branchId);
  }
  if (params?.source && params.source !== "all") {
    search.set("source", params.source);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchStudents(
  params?: StudentListParams,
): Promise<StudentListPage> {
  const res = await adminFetch(`/api/students${buildListQuery(params)}`, {
    cache: "no-store",
  });
  return parseResponse<StudentListPage>(res);
}

export async function createStudent(
  formData: FormData,
): Promise<CreateStudentResult> {
  const res = await adminFetch("/api/students", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Failed to register student") as Error & {
      field?: string;
      errors?: Record<string, string>;
    };
    if (json.field) err.field = json.field;
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return {
    student: json.data as StudentDetail,
    warnings: json.warnings,
  };
}

/** Returns encrypted *Enc fields only — do not use for UI display. */
export async function fetchStudentDetailApi(id: string): Promise<unknown> {
  const res = await adminFetch(`/api/students/${id}`, { cache: "no-store" });
  return parseResponse(res);
}

export async function updateStudent(
  id: string,
  body: UpdateStudentBody,
): Promise<UpdateStudentResult> {
  const res = await adminFetch(`/api/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Update failed") as Error & {
      field?: string;
      errors?: Record<string, string>;
    };
    if (json.field) err.field = json.field;
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return {
    detail: json.data as StudentDetail,
    warnings: json.warnings,
  };
}

export async function saveStudentEdit(
  id: string,
  body: UpdateStudentBody,
  options?: { photo?: File | null; removePhoto?: boolean },
): Promise<UpdateStudentResult> {
  const hasPhoto = options?.photo && options.photo.size > 0;

  if (!hasPhoto && !options?.removePhoto) {
    return updateStudent(id, body);
  }

  const formData = new FormData();
  formData.set("data", JSON.stringify(body));
  if (hasPhoto && options.photo) {
    formData.set("photo", options.photo);
  }
  if (options?.removePhoto) {
    formData.set("removePhoto", "true");
  }

  const res = await adminFetch(`/api/students/${id}`, {
    method: "PUT",
    body: formData,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Update failed") as Error & {
      field?: string;
      errors?: Record<string, string>;
    };
    if (json.field) err.field = json.field;
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return {
    detail: json.data as StudentDetail,
    warnings: json.warnings,
  };
}

export async function assignStudentToBatch(
  studentId: string,
  body: AssignBatchBody,
): Promise<AssignStudentResult> {
  const res = await adminFetch(`/api/students/${studentId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<AssignStudentResult>(res);
}

export async function enrollStudentInBatch(
  studentId: string,
  body: EnrollBatchBody,
): Promise<AssignStudentResult> {
  const res = await adminFetch(`/api/students/${studentId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<AssignStudentResult>(res);
}

export async function createPortalAccount(
  studentId: string,
  body: CreatePortalAccountBody,
): Promise<PortalAccountActionResult> {
  const res = await adminFetch(`/api/students/${studentId}/portal-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function setPortalPassword(
  studentId: string,
  body: SetPortalPasswordBody,
): Promise<PortalAccountActionResult> {
  const res = await adminFetch(`/api/students/${studentId}/portal-account/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function disablePortalAccount(
  studentId: string,
  body?: DisablePortalAccountBody,
): Promise<{ message: string }> {
  const res = await adminFetch(`/api/students/${studentId}/portal-account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return parseResponse(res);
}

/** @deprecated Use setPortalPassword with a chosen password instead. */
export async function resetPortalPassword(
  studentId: string,
): Promise<PortalAccountActionResult> {
  const res = await adminFetch(`/api/students/${studentId}/portal-account/reset`, {
    method: "POST",
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function uploadEnrollmentReceipt(
  studentId: string,
  enrollmentId: string,
  file: File,
): Promise<{ receiptUrl: string }> {
  const fd = new FormData();
  fd.set("enrollmentId", enrollmentId);
  fd.set("receipt", file);
  const res = await adminFetch(`/api/students/${studentId}/enrollment-receipt`, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });
  return parseResponse<{ receiptUrl: string }>(res);
}

export async function fetchStudentDocuments(
  studentId: string,
): Promise<StudentDocumentItem[]> {
  const res = await adminFetch(`/api/students/${studentId}/documents`, {
    cache: "no-store",
  });
  return parseResponse<StudentDocumentItem[]>(res);
}

export async function uploadStudentDocuments(
  studentId: string,
  input: {
    nicFront?: File;
    nicBack?: File;
    professionalPhotos?: File[];
  },
): Promise<void> {
  const fd = new FormData();
  if (input.nicFront) fd.set("nicFront", input.nicFront);
  if (input.nicBack) fd.set("nicBack", input.nicBack);
  input.professionalPhotos?.forEach((file) => {
    fd.append("professionalPhotos", file);
  });
  const res = await adminFetch(`/api/students/${studentId}/documents`, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });
  await parseResponse(res);
}

export async function deleteStudent(studentId: string): Promise<void> {
  const res = await adminFetch(`/api/students/${studentId}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await parseResponse(res);
}
