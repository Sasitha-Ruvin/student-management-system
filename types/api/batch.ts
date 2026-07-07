import type {
  CustomInstallmentInput,
  EnrollmentInstallmentSource,
  EnrollmentPaymentPath,
} from "@/types/api/student";

// ── Enums (mirrors Prisma enums) ──────────────────────────────────

export type BatchStatus = "OPEN" | "ACTIVE" | "COMPLETED" | "CLOSED";

export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";

export type EnrollmentStatus =
  | "UNASSIGNED"
  | "ACTIVE"
  | "SUSPENDED"
  | "ON_HOLD"
  | "COMPLETED"
  | "DROPPED";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

// ── Installment template DTOs ─────────────────────────────────────

export type InstallmentTemplateDto = {
  id: string;
  label: string;
  amount: number;
  dueDate: string; // ISO string
  order: number;
};

// ── Batch list ────────────────────────────────────────────────────

export type BatchListItem = {
  id: string;
  batchCode: string;
  name: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  status: BatchStatus;
  startDate: string;
  endDate: string;
  totalSessions: number;
  maxCapacity: number | null;
  enrollmentCount: number;
  sessionCount: number;
  completedSessionCount: number;
  attendancePercent: number | null;
  revenueCollected: number;
  revenueExpected: number;
  createdAt: string;
};

export type BatchListSummary = {
  activeBatchCount: number;
  totalStudents: number;
  avgAttendancePercent: number | null;
  totalRevenueCollected: number;
};

export type BatchListPage = {
  items: BatchListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: BatchListSummary;
};

// ── Batch detail ──────────────────────────────────────────────────

export type BatchDetail = BatchListItem & {
  registrationFee: number;
  courseFee: number;
  oneTimeDiscountAmount: number;
  oneTimePrice: number;
  defaultClassTime: string | null;
  defaultClassEndTime: string | null;
  paymentPlanId: string | null;
  paymentPlanName: string | null;
  installmentTemplates: InstallmentTemplateDto[];
  scheduledSessionCount: number;
  /** Earliest session scheduledAt in batch (ISO), if any */
  firstSessionScheduledAt: string | null;
  /** Latest session scheduledAt in batch (ISO), if any */
  lastSessionScheduledAt: string | null;
};

export type CancelBatchResult = {
  batchId: string;
  status: BatchStatus;
  droppedEnrollmentCount: number;
  batch: BatchDetail;
};

// ── Session preview ───────────────────────────────────────────────

export type SessionPreviewItem = {
  date: string;    // ISO date "YYYY-MM-DD"
  dayOfWeek: number; // 0=Sun … 6=Sat
  selected: boolean;
};

// ── Students tab ──────────────────────────────────────────────────

export type BatchStudentRow = {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  modelCode: string;
  status: EnrollmentStatus;
  regFeePaid: boolean;
  paymentPath: "INSTALLMENT" | "ONE_TIME" | null;
  totalPaid: number;
  totalOwed: number;
  outstanding: number;
};

// ── Sessions tab ──────────────────────────────────────────────────

export type BatchSessionRow = {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  scheduledEndAt: string | null;
  branchId: string;
  branchName: string;
  status: SessionStatus;
  pin: string | null;
  notes?: string | null;
  attendanceCount: number;
  presentCount: number;
  isRelocated: boolean; // true when branchId differs from batch.branchId
};

// ── Global session list ───────────────────────────────────────────

export type SessionListItem = BatchSessionRow & {
  batchId: string;
  batchCode: string;
  batchName: string;
  branchLocation: string;
  defaultClassTime: string | null;
  enrollmentCount: number;
  markedCount: number;
};

export type SessionListSummary = {
  activeToday: number;
  expectedAttendanceToday: number;
};

export type SessionListPage = {
  items: SessionListItem[];
  total: number;
  page: number;
  limit: number;
  summary: SessionListSummary;
};

export type SessionListQuery = {
  page?: number;
  limit?: number;
  tab?: "upcoming" | "completed";
  branchId?: string;
  batchId?: string;
  search?: string;
};

export type SessionBranchNavItem = {
  id: string;
  name: string;
  branchCode: string;
  location: string;
  sessionCount: number;
};

export type SessionBatchNavItem = {
  id: string;
  batchCode: string;
  name: string;
  status: BatchStatus;
  sessionCount: number;
};

export type SessionStudentSearchResult = {
  id: string;
  fullName: string;
  modelCode: string;
  photoUrl: string | null;
  currentBatchCode: string | null;
};

// ── Attendance tab ────────────────────────────────────────────────

export type AttendanceStudent = {
  studentId: string;
  enrollmentId: string;
  fullName: string;
  modelCode: string;
};

export type AttendanceSession = {
  sessionId: string;
  sessionNumber: number;
  scheduledAt: string;
  status: SessionStatus;
};

export type AttendanceGrid = {
  students: AttendanceStudent[];
  sessions: AttendanceSession[];
  /** cells[studentId][sessionId] = status or null (not marked) */
  cells: Record<string, Record<string, AttendanceStatus | null>>;
};

// ── Finance tab ───────────────────────────────────────────────────

export type BatchFinanceInstallment = {
  templateId: string;
  label: string;
  dueDate: string;
  order: number;
  amountPerStudent: number;
  totalOwed: number;   // amountPerStudent × enrollmentCount
  totalCollected: number;
  outstanding: number;
};

export type BatchFinanceSummary = {
  enrollmentCount: number;
  totalExpected: number;  // sum of all installment totals
  totalCollected: number;
  outstanding: number;
  installments: BatchFinanceInstallment[];
};

// ── Request bodies ────────────────────────────────────────────────

export type InstallmentInput = {
  label: string;
  amount: number;
  dueDate: string; // ISO date
  order: number;
};

export type ConfirmedSessionInput = {
  date: string;
  /** HH:mm Colombo — defaults to batch defaultClassTime when omitted */
  classTime?: string;
  /** HH:mm Colombo — optional end time for this session only */
  classEndTime?: string | null;
};

export type CreateBatchBody = {
  name: string;
  branchId: string;
  startDate: string;        // ISO date "YYYY-MM-DD"
  endDate: string;          // ISO date "YYYY-MM-DD"
  defaultClassTime: string; // "09:00"
  /** HH:mm Colombo — optional default end time for sessions */
  defaultClassEndTime?: string | null;
  registrationFee: number;
  courseFee: number;
  maxCapacity?: number | null;
  paymentPlanId?: string;   // optional pre-fill reference
  confirmedSessions: ConfirmedSessionInput[];
  installments: InstallmentInput[];
};

export type UpdateBatchBody = {
  name?: string;
  endDate?: string;
  status?: BatchStatus;
  registrationFee?: number;
  courseFee?: number;
  defaultClassTime?: string;
  defaultClassEndTime?: string | null;
};

export type UpdateBatchResult = {
  batch: BatchDetail;
  warnings?: string[];
};

export type UpdateBatchInstallmentTemplatesBody = {
  templates: InstallmentInput[];
  applyToExisting?: boolean;
};

export type SkippedInstallmentSyncDto = {
  enrollmentId: string;
  installmentId: string;
  order: number;
  reason: "PAID_OR_PARTIAL" | "CANCELLED" | "NOT_FOUND";
};

export type UpdateBatchInstallmentTemplatesResult = {
  batch: BatchDetail;
  sync: {
    dueDatesUpdated: number;
    amountsUpdated: number;
    labelsUpdated: number;
    skipped: SkippedInstallmentSyncDto[];
  };
  warning?: string;
};

export type CreateSessionBody = {
  scheduledAt: string; // start — full ISO datetime
  scheduledEndAt?: string | null;
  branchId?: string;
  pin?: string | null;
  notes?: string | null;
  notifyStudents?: boolean;
  studentMessage?: string;
  templateId?: string | null;
};

export type CreateSessionResult = {
  session: BatchSessionRow;
  smsResult?: SessionEditSmsResult;
  warning?: string;
  warnings?: string[];
  smsWarning?: string;
};

export type UpdateSessionAction =
  | {
      action: "update-details";
      scheduledAt: string;
      scheduledEndAt?: string | null;
      branchId: string;
      notes?: string | null;
      pin?: string | null;
      clearPin?: boolean;
    }
  | {
      action: "reschedule";
      scheduledAt: string;
      notifyStudents?: boolean;
      studentMessage?: string;
      templateId?: string | null;
    }
  | { action: "relocate"; branchId: string }
  | {
      action: "cancel";
      notifyStudents?: boolean;
      studentMessage?: string;
      templateId?: string | null;
    }
  | { action: "complete" }
  | { action: "set-pin"; pin: string }
  | { action: "clear-pin" }
  | {
      action: "edit";
      notes?: string | null;
      studentMessage?: string | null;
      templateId?: string | null;
    }
  | { action: "move-up" }
  | { action: "move-down" }
  | { action: "set-session-number"; sessionNumber: number };

export type SessionEditEmailResult = {
  sent: number;
  failed: number;
  skippedNoEmail: number;
};

export type SessionEditSmsResult = {
  sent: number;
  failed: number;
  skippedNoPhone: number;
  skippedNotConfigured: number;
  totalEnrolled: number;
  lastError?: string;
};

export type SessionEditResult = {
  sessionId: string;
  notes: string | null;
  emailResult?: SessionEditEmailResult;
  smsResult?: SessionEditSmsResult;
  warning?: string;
};

export type BulkRescheduleBody = {
  fromDate: string; // ISO date — reschedule all SCHEDULED sessions on/after this
  pushDays: number; // positive integer
  notifyStudents?: boolean;
  studentMessage?: string;
  templateId?: string | null;
};

export type UpdateAttendanceCellBody = {
  studentId: string;
  sessionId: string;
  status: AttendanceStatus | null; // null = remove (mark as not recorded)
};

export type TransferSettlementKind =
  | "CREDIT_NOTE"
  | "APPLY_TO_NEW"
  | "REFUND_RECORD"
  | "MANUAL_ADJUSTMENT";

export type TransferSettlementBody = {
  kind: TransferSettlementKind;
  amount: number;
  notes?: string | null;
};

export type TransferInstallmentBalanceLine = {
  installmentId: string;
  label: string;
  status: string;
  amount: number;
  paidAmount: number;
  overdueFeePaid: number;
  willCancel: boolean;
  unpaidBeforeCancel: number;
};

export type TransferBalancePreview = {
  sourceEnrollmentId: string;
  sourceBatchCode: string;
  regFeePaid: boolean;
  registrationFeeCollected: number;
  installmentCollected: number;
  totalCollected: number;
  cancelledUnpaidTotal: number;
  installments: TransferInstallmentBalanceLine[];
};

export type TransferEnrollmentBody = {
  action: "transfer";
  targetBatchId: string;
  paymentPath: EnrollmentPaymentPath;
  installmentSource?: EnrollmentInstallmentSource;
  paymentPlanId?: string | null;
  customInstallments?: CustomInstallmentInput[];
  customCourseFee?: number | null;
  regFeePaid?: boolean;
  notes?: string | null;
  settlement?: TransferSettlementBody | null;
};

export type EnrollmentAction =
  | { action: "suspend" }
  | { action: "hold" }
  | { action: "activate" }
  | { action: "drop" }
  | TransferEnrollmentBody;

// ── Session detail ────────────────────────────────────────────────

export type SessionAttendanceRow = {
  attendanceId: string;
  studentId: string;
  fullName: string;
  modelCode: string;
  photoUrl: string | null;
  status: AttendanceStatus;
  source: "ADMIN" | "STUDENT";
  markedAt: string;
  notes: string | null;
  isCrossBranch: boolean;
};

export type SessionDetail = {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  scheduledEndAt: string | null;
  status: SessionStatus;
  pin: string | null;
  notes: string | null;
  isRelocated: boolean;
  batchId: string;
  batchCode: string;
  batchName: string;
  batchBranchId: string;
  branchId: string;
  branchName: string;
  branchLocation: string;
  attendances: SessionAttendanceRow[];
  /** Enrolled-but-not-yet-marked students for this session */
  unmarkedStudents: {
    studentId: string;
    fullName: string;
    modelCode: string;
    photoUrl: string | null;
  }[];
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    unmarked: number;
  };
};

export type MarkAttendanceBody = {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
};
