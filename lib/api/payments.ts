import { adminFetch } from "@/lib/api/admin-fetch";
import type { ReceiptDeliveryContext } from "@/lib/payments/notify-payment-receipts";
import type {
  BatchPaymentHistoryPage,
  CascadeAppliedSlice,
  InstallmentListPage,
  InvoicePdfStatus,
  InvoiceSendContext,
  PaymentRecord,
  RecordPaymentCascadeResult,
  RecordPaymentRequest,
  RecordRegistrationPaymentRequest,
  StudentPaymentHistory,
  UpdateInstallmentBody,
  UpdateInstallmentResult,
  VoidPaymentResult,
  SendInvoiceRequest,
  SendInvoiceResult,
} from "@/types/api/payment";

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      errors?: Record<string, string>;
      warning?: string;
    };
    if (json.errors) err.errors = json.errors;
    if (json.warning) err.warning = json.warning;
    throw err;
  }
  return json.data as T;
}

export type FetchInstallmentsParams = {
  batchId: string; // batch UUID or "all"
  branchId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function fetchInstallments(
  params: FetchInstallmentsParams,
): Promise<InstallmentListPage> {
  const qs = new URLSearchParams();
  qs.set("batchId", params.batchId);
  if (params.branchId && params.branchId !== "all") {
    qs.set("branchId", params.branchId);
  }
  if (params.status && params.status !== "all") {
    qs.set("status", params.status);
  }
  if (params.search?.trim()) {
    qs.set("search", params.search.trim());
  }
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await adminFetch(`/api/payments/installments?${qs.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<InstallmentListPage>(res);
}

export async function fetchStudentInstallments(
  studentId: string,
): Promise<InstallmentListPage> {
  const res = await adminFetch(`/api/students/${studentId}/installments`, {
    cache: "no-store",
  });
  return parseResponse<InstallmentListPage>(res);
}

export type RecordPaymentResult = RecordPaymentCascadeResult & {
  /** @deprecated Use primaryPayment */
  payment: PaymentRecord;
  warning?: string;
};

export async function recordPayment(
  body: RecordPaymentRequest,
): Promise<RecordPaymentResult> {
  const res = await adminFetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      errors?: Record<string, string>;
    };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  const data = json.data as RecordPaymentCascadeResult & { payment?: PaymentRecord };
  const primaryPayment = data.primaryPayment ?? data.payment!;
  return {
    payments: data.payments,
    primaryPayment,
    applied: data.applied,
    baseRemaining: 0,
    feeRemaining: 0,
    totalRemaining: 0,
    payment: primaryPayment,
    warning: json.warning as string | undefined,
  };
}

export async function voidPaymentApi(
  paymentId: string,
  reason: string,
): Promise<{ data: VoidPaymentResult; message?: string }> {
  const res = await adminFetch(`/api/payments/${paymentId}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Failed to void payment");
  }
  return {
    data: json.data as VoidPaymentResult,
    message: json.message as string | undefined,
  };
}

export async function recordRegistrationPayment(
  body: RecordRegistrationPaymentRequest,
): Promise<{ payment: PaymentRecord; warning?: string }> {
  const res = await adminFetch("/api/payments/registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      errors?: Record<string, string>;
    };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return {
    payment: json.data.payment as PaymentRecord,
    warning: json.warning as string | undefined,
  };
}

export type { CascadeAppliedSlice, ReceiptDeliveryContext };

export async function fetchReceiptDeliveryContext(
  studentId: string,
): Promise<ReceiptDeliveryContext> {
  const res = await adminFetch(`/api/students/${studentId}/receipt-delivery`, {
    cache: "no-store",
  });
  return parseResponse<ReceiptDeliveryContext>(res);
}

export async function fetchBatchPaymentHistory(
  batchId: string,
  page = 1,
  limit = 20,
): Promise<BatchPaymentHistoryPage> {
  const qs = new URLSearchParams({
    batchId,
    page: String(page),
    limit: String(limit),
  });
  const res = await adminFetch(`/api/payments/history?${qs.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<BatchPaymentHistoryPage>(res);
}

export async function fetchRegistrationPayment(
  studentId: string,
  enrollmentId: string,
): Promise<PaymentRecord | null> {
  const qs = new URLSearchParams({ enrollmentId });
  const res = await adminFetch(
    `/api/students/${studentId}/registration-payment?${qs.toString()}`,
    { cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as PaymentRecord | null;
}

export async function fetchStudentPayments(
  studentId: string,
): Promise<StudentPaymentHistory> {
  const res = await adminFetch(`/api/students/${studentId}/payments`, {
    cache: "no-store",
  });
  return parseResponse<StudentPaymentHistory>(res);
}

export async function sendPaymentEmail(
  paymentId: string,
  recipients?: Array<"student" | "admin">,
): Promise<void> {
  const res = await adminFetch(`/api/payments/${paymentId}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients }),
    cache: "no-store",
  });
  await parseResponse<{ sent: boolean }>(res);
}

export async function fetchInvoiceSendContext(
  paymentId: string,
): Promise<InvoiceSendContext> {
  const res = await adminFetch(`/api/payments/${paymentId}/invoice/context`, {
    cache: "no-store",
  });
  return parseResponse<InvoiceSendContext>(res);
}

export async function sendInvoiceToStudent(
  paymentId: string,
  body: SendInvoiceRequest,
): Promise<SendInvoiceResult> {
  const res = await adminFetch(`/api/payments/${paymentId}/invoice/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<SendInvoiceResult>(res);
}

/**
 * Downloads the invoice PDF for a payment and triggers a browser file save.
 */
export async function updateInstallment(
  installmentId: string,
  body: UpdateInstallmentBody,
): Promise<UpdateInstallmentResult> {
  const res = await adminFetch(`/api/payments/installments/${installmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<UpdateInstallmentResult>(res);
}

export async function fetchInvoicePdfStatus(
  paymentId: string,
): Promise<InvoicePdfStatus> {
  const res = await adminFetch(`/api/payments/${paymentId}/invoice/status`, {
    cache: "no-store",
  });
  return parseResponse<InvoicePdfStatus>(res);
}

export async function retryInvoicePdfUpload(
  paymentId: string,
): Promise<{ uploadStatus: string; pdfUrl: string | null; message: string }> {
  const res = await adminFetch(`/api/payments/${paymentId}/invoice/retry`, {
    method: "POST",
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function waiveInstallmentOverdueCharge(
  installmentId: string,
  waived: boolean,
): Promise<{ message: string }> {
  const res = await adminFetch(
    `/api/payments/installments/${installmentId}/overdue-charge`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waived }),
      cache: "no-store",
    },
  );
  return parseResponse(res);
}

export async function fetchInvoicePdfBlob(paymentId: string): Promise<Blob> {
  const res = await adminFetch(`/api/payments/${paymentId}/invoice?inline=1`, {
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to load invoice PDF";
    try {
      const json = await res.json();
      if (json.error) message = json.error;
    } catch {
      // response was not JSON
    }
    throw new Error(message);
  }

  return res.blob();
}

export async function downloadInvoicePdf(
  paymentId: string,
  filename?: string,
): Promise<void> {
  const blob = await fetchInvoicePdfBlob(paymentId);
  const name = filename ?? `invoice-${paymentId}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
