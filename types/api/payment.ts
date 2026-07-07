// ── Enums ─────────────────────────────────────────────────────────

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";

export type InstallmentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

// ── Installment list (payments page — batch view) ─────────────────

/**
 * One row in the payments dashboard installment table.
 * Represents a single installment belonging to one enrolled student.
 */
export type InstallmentLatestPayment = {
  paymentId: string;
  invoiceNumber: string;
};

export type InstallmentPaymentHistoryItem = {
  paymentId: string;
  amount: number;
  paymentDate: string;
  invoiceNumber: string;
};

export type InstallmentListItem = {
  installmentId: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  modelCode: string;
  /** Batch code when listing across all batches */
  batchCode?: string | null;
  batchName?: string | null;
  label: string;         // e.g. "Instalment 1", "One-time course payment"
  dueDate: string;       // ISO date string
  amount: number;        // target instalment amount (excludes overdue fee)
  paidAmount: number;    // paid toward instalment amount
  overdueCharge: number;
  overdueChargePaid: number;
  overdueChargeWaived: boolean;
  baseRemaining: number;
  feeRemaining: number;
  /** @deprecated Use totalRemaining — kept for compatibility */
  remaining: number;
  totalRemaining: number;
  status: InstallmentStatus;
  order: number;
  /** Most recent payment for this instalment, if any */
  latestPayment: InstallmentLatestPayment | null;
  /** All payments recorded against this instalment (oldest first) */
  payments: InstallmentPaymentHistoryItem[];
};

export type InstallmentListPage = {
  items: InstallmentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UpdateInstallmentBody = {
  dueDate?: string;
  amount?: number;
  label?: string;
  /** When changing due date: use today vs latest payment date for overdue check */
  overdueAsOf?: "payment_date" | "today";
};

export type UpdateInstallmentResult = {
  installmentId: string;
  label: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  overdueCharge: number;
};

export type InvoicePdfDisplayStatus = "ready" | "generating" | "failed";

export type InvoicePdfStatus = {
  uploadStatus: "PENDING" | "READY" | "FAILED";
  displayStatus: InvoicePdfDisplayStatus;
  pdfUrl: string | null;
  isStale: boolean;
  uploadError: string | null;
};

// ── Record payment request ────────────────────────────────────────

export type RecordPaymentRequest = {
  studentId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;   // ISO date string, can be past
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  sendEmail?: boolean;   // default true
  sendSms?: boolean;     // default false
  /** When true, waive the overdue fee on this instalment for this payment */
  waiveOverdueCharge?: boolean;
};

export type CascadeAppliedSlice = {
  installmentId: string;
  label: string;
  amount: number;
};

export type RecordPaymentCascadeResult = {
  payments: PaymentRecord[];
  primaryPayment: PaymentRecord;
  applied: CascadeAppliedSlice[];
  baseRemaining: number;
  feeRemaining: number;
  totalRemaining: number;
};

export type RecordRegistrationPaymentRequest = {
  studentId: string;
  enrollmentId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  sendEmail?: boolean;
  sendSms?: boolean;
};

// ── Recorded payment ──────────────────────────────────────────────

export type PaymentRecord = {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  studentId: string;
  installmentId: string | null;
  installmentLabel: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  recordedByName: string;
  pdfUrl: string | null;
  createdAt: string;
};

// ── Student payment history item ──────────────────────────────────

export type PaymentHistoryItem = {
  paymentId: string;
  invoiceNumber: string;
  studentName?: string;
  installmentLabel: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  recordedByName: string;
  pdfUrl: string | null;
  createdAt: string;
  voidedAt?: string | null;
  voidReason?: string | null;
};

export type VoidPaymentRequest = {
  reason: string;
};

export type ReRecordHint =
  | {
      type: "installment";
      installmentId: string;
      enrollmentId: string;
      studentId: string;
      studentName: string;
      label: string;
      dueDate: string;
      amount: number;
      paidAmount: number;
      overdueCharge: number;
      overdueChargeWaived: boolean;
      baseRemaining: number;
      feeRemaining: number;
      totalRemaining: number;
      status: InstallmentStatus;
    }
  | {
      type: "registration";
      enrollmentId: string;
      studentId: string;
      studentName: string;
      batchCode: string | null;
      registrationFee: number;
    };

export type VoidPaymentResult = {
  paymentId: string;
  voidedAt: string;
  studentId: string;
  installmentId: string | null;
  installmentLabel: string | null;
  reRecord: ReRecordHint | null;
};

export type StudentPaymentHistory = {
  items: PaymentHistoryItem[];
  totalPaid: number;
};

export type BatchPaymentHistoryPage = {
  items: PaymentHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ── Email request ─────────────────────────────────────────────────

export type SendPaymentEmailRequest = {
  /** Which addresses to send to — defaults to both */
  recipients?: Array<"student" | "admin">;
};

export type InvoiceSendContext = {
  paymentId: string;
  invoiceNumber: string;
  studentName: string;
  studentEmail: string;
  smsPhone: string;
  smsPhoneValid: boolean;
  amount: number;
  currency: string;
  paymentDate: string;
  emailConfigured: boolean;
  smsConfigured: boolean;
};

export type SendInvoiceRequest = {
  sendEmail?: boolean;
  sendSms?: boolean;
  emailRecipients?: Array<"student" | "admin">;
};

export type SendInvoiceResult = {
  emailSent: boolean;
  smsSent: boolean;
  emailWarning?: string;
  smsWarning?: string;
};
