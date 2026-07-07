import { computeOneTimePrice } from "@/lib/payments/payment-plan-utils";
import { splitStoredSessionNotes } from "@/lib/sessions/session-schedule-meta";
import type {
  AttendanceStatus,
  BatchDetail,
  BatchFinanceSummary,
  BatchListItem,
  BatchSessionRow,
  BatchStudentRow,
  InstallmentTemplateDto,
} from "@/types/api/batch";

type PrismaBatch = {
  id: string;
  batchCode: string;
  name: string;
  branchId: string;
  branch: { name: string; branchCode: string };
  status: string;
  startDate: Date;
  endDate: Date;
  totalSessions: number;
  maxCapacity: number | null;
  defaultClassTime: string | null;
  defaultClassEndTime: string | null;
  registrationFee: { toNumber(): number };
  courseFee: { toNumber(): number };
  paymentPlanId: string | null;
  createdAt: Date;
  _count: {
    enrollments: number;
    sessions: number;
  };
};

export type BatchListMetricsInput = {
  activeEnrollmentCount: number;
  revenueCollected: number;
  revenueExpected: number;
  attendancePercent: number | null;
};

type PrismaBatchWithTemplates = PrismaBatch & {
  installmentTemplates: {
    id: string;
    label: string;
    amount: { toNumber(): number };
    dueDate: Date;
    order: number;
  }[];
  paymentPlan?: {
    id: string;
    name: string;
    oneTimeDiscountAmount: { toNumber(): number };
  } | null;
  _count: PrismaBatch["_count"] & { sessions: number };
};

type PrismaSessionWithCount = {
  id: string;
  sessionNumber: number;
  scheduledAt: Date;
  branchId: string;
  branch: { name: string };
  batchId: string;
  status: string;
  pin: string | null;
  notes: string | null;
  _count: { attendances: number };
  presentCount: number;
  batch: { branchId: string };
};

type PrismaEnrollmentWithStudent = {
  id: string;
  status: string;
  regFeePaid: boolean;
  paymentPath: string | null;
  student: {
    id: string;
    fullName: string;
    modelCode: string;
  };
  totalPaid: number;
  totalOwed: number;
};

export function toBatchListItem(
  b: PrismaBatch,
  completedSessionCount = 0,
  metrics?: BatchListMetricsInput,
): BatchListItem {
  return {
    id: b.id,
    batchCode: b.batchCode,
    name: b.name,
    branchId: b.branchId,
    branchName: b.branch.name,
    branchCode: b.branch.branchCode,
    status: b.status as BatchListItem["status"],
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    totalSessions: b.totalSessions,
    maxCapacity: b.maxCapacity,
    enrollmentCount: metrics?.activeEnrollmentCount ?? b._count.enrollments,
    sessionCount: b._count.sessions,
    completedSessionCount,
    attendancePercent: metrics?.attendancePercent ?? null,
    revenueCollected: metrics?.revenueCollected ?? 0,
    revenueExpected: metrics?.revenueExpected ?? 0,
    createdAt: b.createdAt.toISOString(),
  };
}

export function toBatchDetail(
  b: PrismaBatchWithTemplates,
  completedSessionCount = 0,
  scheduledSessionCount = 0,
  metrics?: BatchListMetricsInput,
): BatchDetail {
  const templates: InstallmentTemplateDto[] = b.installmentTemplates.map((t) => ({
    id: t.id,
    label: t.label,
    amount: t.amount.toNumber(),
    dueDate: t.dueDate.toISOString(),
    order: t.order,
  }));

  const courseFee = b.courseFee.toNumber();
  const oneTimeDiscountAmount = Number(
    b.paymentPlan?.oneTimeDiscountAmount ?? 0,
  );

  return {
    ...toBatchListItem(b, completedSessionCount, metrics),
    registrationFee: b.registrationFee.toNumber(),
    courseFee,
    oneTimeDiscountAmount,
    oneTimePrice: computeOneTimePrice(courseFee, oneTimeDiscountAmount),
    defaultClassTime: b.defaultClassTime,
    defaultClassEndTime: b.defaultClassEndTime,
    paymentPlanId: b.paymentPlanId,
    paymentPlanName: b.paymentPlan?.name ?? null,
    installmentTemplates: templates,
    scheduledSessionCount,
    firstSessionScheduledAt: null,
    lastSessionScheduledAt: null,
  };
}

export function toBatchSessionRow(s: PrismaSessionWithCount): BatchSessionRow {
  const schedule = splitStoredSessionNotes(s.notes);
  return {
    id: s.id,
    sessionNumber: s.sessionNumber,
    scheduledAt: s.scheduledAt.toISOString(),
    scheduledEndAt: schedule.scheduledEndAt,
    branchId: s.branchId,
    branchName: s.branch.name,
    status: s.status as BatchSessionRow["status"],
    pin: s.pin,
    notes: schedule.notes,
    attendanceCount: s._count.attendances,
    presentCount: s.presentCount,
    isRelocated: s.branchId !== s.batch.branchId,
  };
}

export function toBatchStudentRow(e: PrismaEnrollmentWithStudent): BatchStudentRow {
  return {
    enrollmentId: e.id,
    studentId: e.student.id,
    fullName: e.student.fullName,
    modelCode: e.student.modelCode,
    status: e.status as BatchStudentRow["status"],
    regFeePaid: e.regFeePaid,
    paymentPath: e.paymentPath as BatchStudentRow["paymentPath"],
    totalPaid: e.totalPaid,
    totalOwed: e.totalOwed,
    outstanding: Math.max(0, e.totalOwed - e.totalPaid),
  };
}

export function toAttendanceStatusValue(
  raw: string,
): AttendanceStatus {
  if (raw === "ABSENT" || raw === "LATE") return raw;
  return "PRESENT";
}

export function toBatchFinanceSummary(data: {
  enrollmentCount: number;
  templates: {
    id: string;
    label: string;
    dueDate: Date;
    order: number;
    amount: { toNumber(): number };
    collectedSum: number;
  }[];
}): BatchFinanceSummary {
  const installments = data.templates.map((t) => {
    const amountPerStudent = t.amount.toNumber();
    const totalOwed = amountPerStudent * data.enrollmentCount;
    const totalCollected = t.collectedSum;
    return {
      templateId: t.id,
      label: t.label,
      dueDate: t.dueDate.toISOString(),
      order: t.order,
      amountPerStudent,
      totalOwed,
      totalCollected,
      outstanding: Math.max(0, totalOwed - totalCollected),
    };
  });

  const totalExpected = installments.reduce((s, i) => s + i.totalOwed, 0);
  const totalCollected = installments.reduce((s, i) => s + i.totalCollected, 0);

  return {
    enrollmentCount: data.enrollmentCount,
    totalExpected,
    totalCollected,
    outstanding: Math.max(0, totalExpected - totalCollected),
    installments,
  };
}
