import type { Prisma } from "@/app/generated/prisma";
import { computeInstallmentBalance } from "@/lib/payments/installment-balance";
import { prisma } from "@/lib/prisma";
import {
  mapPaymentHistoryItem,
  mapPaymentRecord,
  PAYMENT_SENSITIVE_SELECT,
} from "@/lib/payments/map-payment-record";
import { isRegistrationFeeRow } from "@/lib/payments/payment-sensitive";
import { regFeePaymentTag } from "@/lib/payments/registration-fee";
import { buildStudentTextSearchWhere } from "@/lib/students/student-pii";
import { invoicePdfProxyUrl } from "@/lib/storage/proxy-urls";
import type {
  InstallmentListItem,
  InstallmentListPage,
  PaymentHistoryItem,
  PaymentRecord,
} from "@/types/api/payment";

// ── Installments by batch ─────────────────────────────────────────

type GetInstallmentsByBatchOptions = {
  batchId: string;
  branchId?: string | null;
  status?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

const ALL_BATCHES = "all";

const installmentSelect = {
  id: true,
  enrollmentId: true,
  label: true,
  dueDate: true,
  amount: true,
  paidAmount: true,
  overdueCharge: true,
  overdueChargePaid: true,
  overdueChargeWaived: true,
  status: true,
  order: true,
  payments: {
    where: { voidedAt: null },
    orderBy: { paymentDate: "asc" as const },
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      invoice: { select: { invoiceNumber: true } },
    },
  },
  enrollment: {
    select: {
      batch: { select: { batchCode: true, name: true } },
      student: {
        select: {
          id: true,
          fullName: true,
          modelCode: true,
        },
      },
    },
  },
} as const;

function installmentWhere(
  opts: Pick<
    GetInstallmentsByBatchOptions,
    "batchId" | "branchId" | "status" | "search"
  >,
): Prisma.InstallmentWhereInput {
  const { batchId, branchId, status, search } = opts;
  const allBatches = batchId === ALL_BATCHES;

  return {
    enrollment: {
      ...(allBatches
        ? { batchId: { not: null } }
        : { batchId }),
      status: { notIn: ["DROPPED", "UNASSIGNED"] },
      ...(branchId ? { batch: { branchId } } : {}),
      student: search
        ? { OR: buildStudentTextSearchWhere(search) }
        : undefined,
    },
    ...(status
      ? { status: status as never }
      : { status: { not: "CANCELLED" } }),
  };
}

function mapInstallmentRow(
  row: Prisma.InstallmentGetPayload<{ select: typeof installmentSelect }>,
): InstallmentListItem {
  const amount = Number(row.amount);
  const paidAmount = Number(row.paidAmount);
  const overdueCharge = Number(row.overdueCharge);
  const overdueChargePaid = Number(row.overdueChargePaid);
  const overdueChargeWaived = row.overdueChargeWaived;
  const balance = computeInstallmentBalance({
    amount,
    paidAmount,
    overdueCharge,
    overdueChargePaid,
    overdueChargeWaived,
  });
  const paymentHistory = row.payments
    .filter((p) => p.invoice?.invoiceNumber)
    .map((p) => ({
      paymentId: p.id,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      invoiceNumber: p.invoice!.invoiceNumber,
    }));
  const latest = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;
  return {
    installmentId: row.id,
    enrollmentId: row.enrollmentId,
    studentId: row.enrollment.student.id,
    studentName: row.enrollment.student.fullName,
    modelCode: row.enrollment.student.modelCode,
    batchCode: row.enrollment.batch?.batchCode ?? null,
    batchName: row.enrollment.batch?.name ?? null,
    label: row.label,
    dueDate: row.dueDate.toISOString(),
    amount,
    paidAmount,
    overdueCharge,
    overdueChargePaid,
    overdueChargeWaived,
    baseRemaining: balance.baseRemaining,
    feeRemaining: balance.feeRemaining,
    remaining: balance.totalRemaining,
    totalRemaining: balance.totalRemaining,
    status: row.status as InstallmentListItem["status"],
    order: row.order,
    latestPayment: latest
      ? { paymentId: latest.paymentId, invoiceNumber: latest.invoiceNumber }
      : null,
    payments: paymentHistory,
  };
}

export async function getInstallmentsByBatch(
  opts: GetInstallmentsByBatchOptions,
): Promise<InstallmentListPage> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const allBatches = opts.batchId === ALL_BATCHES;
  const where = installmentWhere(opts);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.installment.findMany({
      where,
      select: installmentSelect,
      orderBy: allBatches
        ? [
            { enrollment: { batch: { batchCode: "asc" } } },
            { enrollment: { student: { modelCode: "asc" } } },
            { order: "asc" },
          ]
        : [
            { enrollment: { student: { modelCode: "asc" } } },
            { order: "asc" },
          ],
      skip,
      take: limit,
    }),
    prisma.installment.count({ where }),
  ]);

  return {
    items: rows.map(mapInstallmentRow),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ── Installments by student (profile tab) ────────────────────────

export async function getInstallmentsByStudent(
  studentId: string,
): Promise<InstallmentListPage> {
  const rows = await prisma.installment.findMany({
    where: {
      status: { not: "CANCELLED" },
      enrollment: {
        studentId,
        status: { notIn: ["DROPPED", "UNASSIGNED"] },
      },
    },
    select: installmentSelect,
    orderBy: [{ order: "asc" }],
  });

  const items = rows.map(mapInstallmentRow);
  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length || 1,
    totalPages: 1,
  };
}

// ── Payment history for a student ────────────────────────────────

export async function getPaymentsByStudent(
  studentId: string,
): Promise<PaymentHistoryItem[]> {
  const rows = await prisma.payment.findMany({
    where: { studentId },
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      studentId: true,
      installmentId: true,
      amount: true,
      paymentDate: true,
      method: true,
      voidedAt: true,
      createdAt: true,
      ...PAYMENT_SENSITIVE_SELECT,
      installment: { select: { label: true } },
      invoice: { select: { invoiceNumber: true, pdfUrl: true } },
      recordedBy: { select: { name: true } },
    },
  });

  return rows.map((row) => {
    const item = mapPaymentHistoryItem(row);
    return {
      ...item,
      installmentLabel: row.installment?.label
        ? row.installment.label
        : isRegistrationFeeRow(row)
          ? "Registration fee"
          : null,
    };
  });
}

/** Finds the registration-fee payment for an enrollment, if recorded. */
export async function findRegistrationPaymentForEnrollment(
  studentId: string,
  enrollmentId: string,
): Promise<PaymentRecord | null> {
  const row = await prisma.payment.findFirst({
    where: {
      studentId,
      installmentId: null,
      voidedAt: null,
      OR: [
        { paymentTag: regFeePaymentTag(enrollmentId) },
        { notes: { startsWith: `REG_FEE:${enrollmentId}` } },
      ],
    },
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      studentId: true,
      installmentId: true,
      amount: true,
      paymentDate: true,
      method: true,
      createdAt: true,
      ...PAYMENT_SENSITIVE_SELECT,
      installment: { select: { label: true } },
      invoice: { select: { id: true, invoiceNumber: true, pdfUrl: true } },
      recordedBy: { select: { name: true } },
    },
  });

  if (!row?.invoice) return null;

  return mapPaymentRecord({ ...row, invoice: row.invoice });
}

// ── Single payment by id (for email route) ────────────────────────

export async function getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
  const row = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      studentId: true,
      installmentId: true,
      amount: true,
      paymentDate: true,
      method: true,
      createdAt: true,
      ...PAYMENT_SENSITIVE_SELECT,
      installment: { select: { label: true } },
      invoice: { select: { id: true, invoiceNumber: true, pdfUrl: true } },
      recordedBy: { select: { name: true } },
    },
  });

  if (!row?.invoice) return null;

  return mapPaymentRecord({ ...row, invoice: row.invoice });
}
