import { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import type {
  DashboardFinance,
  DashboardMonthlyCollection,
  DashboardStats,
} from "@/types/api/dashboard";

const ACTIVE_ENROLLMENT: Prisma.EnrollmentWhereInput = {
  status: { notIn: ["DROPPED", "UNASSIGNED"] },
  batchId: { not: null },
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function enrollmentWhere(branchId?: string): Prisma.EnrollmentWhereInput {
  return {
    ...ACTIVE_ENROLLMENT,
    ...(branchId ? { batch: { branchId } } : {}),
  };
}

function buildMonthlyBuckets(now: Date): DashboardMonthlyCollection[] {
  const buckets: DashboardMonthlyCollection[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en", { month: "short" });
    buckets.push({ month, label, amount: 0 });
  }
  return buckets;
}

type MonthlyRow = { month: string; total: string | number };

async function fetchMonthlyPaymentTotals(
  since: Date,
  branchId?: string,
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();

  if (branchId) {
    const rows = await prisma.$queryRaw<MonthlyRow[]>`
      SELECT to_char(p."paymentDate", 'YYYY-MM') AS month,
             COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      LEFT JOIN installments i ON i.id = p."installmentId"
      LEFT JOIN enrollments e ON e.id = i."enrollmentId"
      LEFT JOIN batches b ON b.id = e."batchId"
      WHERE p."paymentDate" >= ${since}
        AND (
          b."branchId" = ${branchId}
          OR (
            p."installmentId" IS NULL
            AND EXISTS (
              SELECT 1 FROM students s
              WHERE s.id = p."studentId"
                AND s."preferredBranchId" = ${branchId}
            )
          )
        )
      GROUP BY 1
    `;
    for (const row of rows) {
      totals.set(row.month, Number(row.total));
    }
    return totals;
  }

  const rows = await prisma.$queryRaw<MonthlyRow[]>`
    SELECT to_char("paymentDate", 'YYYY-MM') AS month,
           COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE "paymentDate" >= ${since}
    GROUP BY 1
  `;
  for (const row of rows) {
    totals.set(row.month, Number(row.total));
  }
  return totals;
}

async function fetchDashboardFinance(branchId?: string): Promise<DashboardFinance> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const enrollmentFilter = enrollmentWhere(branchId);

  const overdueWhere: Prisma.InstallmentWhereInput = {
    enrollment: enrollmentFilter,
    status: { not: "CANCELLED" },
    OR: [
      { status: "OVERDUE" },
      { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: now } },
    ],
  };

  const paymentMonthWhere: Prisma.PaymentWhereInput = {
    voidedAt: null,
    paymentDate: { gte: monthStart },
    ...(branchId
      ? {
          OR: [
            {
              installment: {
                enrollment: { batch: { branchId } },
              },
            },
            {
              installmentId: null,
              student: { preferredBranchId: branchId },
            },
          ],
        }
      : {}),
  };

  const [
    settings,
    installmentTotals,
    collectedThisMonthAgg,
    overdueCount,
    monthlyTotals,
  ] = await Promise.all([
    prisma.academySettings.findUnique({
      where: { id: "default" },
      select: { currency: true },
    }),
    prisma.installment.aggregate({
      where: {
        enrollment: enrollmentFilter,
        status: { not: "CANCELLED" },
      },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.payment.aggregate({
      where: paymentMonthWhere,
      _sum: { amount: true },
    }),
    prisma.installment.count({ where: overdueWhere }),
    fetchMonthlyPaymentTotals(sixMonthsAgo, branchId),
  ]);

  const totalExpected = Number(installmentTotals._sum.amount ?? 0);
  const totalCollected = Number(installmentTotals._sum.paidAmount ?? 0);
  const stillOwed = Math.max(0, totalExpected - totalCollected);
  const collectionRatePercent =
    totalExpected > 0
      ? Math.min(100, Math.round((totalCollected / totalExpected) * 100))
      : null;

  const monthlyBuckets = buildMonthlyBuckets(now);
  for (const bucket of monthlyBuckets) {
    bucket.amount = monthlyTotals.get(bucket.month) ?? 0;
  }

  return {
    currency: settings?.currency ?? "LKR",
    collectedThisMonth: Number(collectedThisMonthAgg._sum.amount ?? 0),
    stillOwed,
    overdueCount,
    collectionRatePercent,
    totalCollected,
    monthlyCollections: monthlyBuckets,
  };
}

export async function fetchDashboardStats(
  branchId?: string,
): Promise<DashboardStats> {
  const now = new Date();
  const weekStart = startOfDay(now);
  const weekEnd = addDays(weekStart, 7);

  const studentWhere: Prisma.StudentWhereInput = branchId
    ? { preferredBranchId: branchId }
    : {};

  const batchWhere: Prisma.BatchWhereInput = {
    status: { in: ["OPEN", "ACTIVE"] },
    ...(branchId ? { branchId } : {}),
  };

  const sessionWhere: Prisma.SessionWhereInput = {
    status: "SCHEDULED",
    scheduledAt: { gte: weekStart, lt: weekEnd },
    ...(branchId ? { branchId } : {}),
  };

  const unassignedWhere: Prisma.EnrollmentWhereInput = {
    status: "UNASSIGNED",
    ...(branchId
      ? { student: { preferredBranchId: branchId } }
      : {}),
  };

  const websitePendingWhere: Prisma.EnrollmentWhereInput = {
    status: "UNASSIGNED",
    student: {
      source: "WEBSITE",
      ...(branchId ? { preferredBranchId: branchId } : {}),
    },
  };

  const [
    totalStudents,
    activeBatches,
    sessionsThisWeek,
    unassignedStudents,
    websitePendingApplications,
    finance,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.batch.count({ where: batchWhere }),
    prisma.session.count({ where: sessionWhere }),
    prisma.enrollment.count({ where: unassignedWhere }),
    prisma.enrollment.count({ where: websitePendingWhere }),
    fetchDashboardFinance(branchId),
  ]);

  return {
    totalStudents,
    activeBatches,
    sessionsThisWeek,
    unassignedStudents,
    websitePendingApplications,
    finance,
  };
}
