import type { EnrollmentStatus } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = ["DROPPED", "UNASSIGNED"];

const ACTIVE_ENROLLMENT = {
  status: { notIn: ACTIVE_ENROLLMENT_STATUSES },
};

export type BatchListMetrics = {
  revenueCollected: number;
  revenueExpected: number;
  attendancePercent: number | null;
  activeEnrollmentCount: number;
};

export async function fetchBatchListMetrics(
  batchIds: string[],
): Promise<Map<string, BatchListMetrics>> {
  const map = new Map<string, BatchListMetrics>();
  if (batchIds.length === 0) return map;

  const enrollmentWhere = {
    batchId: { in: batchIds },
    ...ACTIVE_ENROLLMENT,
  };

  const [
    enrollmentCounts,
    templateGroups,
    enrollmentBatchRows,
    sessions,
    sessionCounts,
  ] = await Promise.all([
    prisma.enrollment.groupBy({
      by: ["batchId"],
      where: enrollmentWhere,
      _count: { id: true },
    }),
    prisma.installmentTemplate.groupBy({
      by: ["batchId"],
      where: { batchId: { in: batchIds } },
      _sum: { amount: true },
    }),
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { id: true, batchId: true },
    }),
    prisma.session.findMany({
      where: {
        batchId: { in: batchIds },
        status: { not: "CANCELLED" },
      },
      select: { id: true, batchId: true },
    }),
    prisma.session.groupBy({
      by: ["batchId"],
      where: {
        batchId: { in: batchIds },
        status: { not: "CANCELLED" },
      },
      _count: { id: true },
    }),
  ]);

  const enrollmentIds = enrollmentBatchRows.map((e) => e.id);
  const enrollmentToBatch = new Map(
    enrollmentBatchRows.map((e) => [e.id, e.batchId!]),
  );

  const sessionIds = sessions.map((s) => s.id);
  const sessionToBatch = new Map(sessions.map((s) => [s.id, s.batchId]));

  const paidByEnrollment =
    enrollmentIds.length > 0
      ? await prisma.installment.groupBy({
          by: ["enrollmentId"],
          where: { enrollmentId: { in: enrollmentIds } },
          _sum: { paidAmount: true },
        })
      : [];

  const presentBySession =
    sessionIds.length > 0
      ? await prisma.attendance.groupBy({
          by: ["sessionId"],
          where: {
            sessionId: { in: sessionIds },
            attendanceStatus: "PRESENT",
            student: {
              enrollments: {
                some: { batchId: { in: batchIds }, ...ACTIVE_ENROLLMENT },
              },
            },
          },
          _count: { id: true },
        })
      : [];

  const enrollmentMap = new Map(
    enrollmentCounts.map((e) => [e.batchId!, e._count.id]),
  );

  const templateMap = new Map(
    templateGroups.map((row) => [row.batchId, Number(row._sum.amount ?? 0)]),
  );

  const paidMap = new Map<string, number>();
  for (const row of paidByEnrollment) {
    const batchId = enrollmentToBatch.get(row.enrollmentId);
    if (!batchId) continue;
    paidMap.set(
      batchId,
      (paidMap.get(batchId) ?? 0) + Number(row._sum.paidAmount ?? 0),
    );
  }

  const presentMap = new Map<string, number>();
  for (const row of presentBySession) {
    const batchId = sessionToBatch.get(row.sessionId);
    if (!batchId) continue;
    presentMap.set(batchId, (presentMap.get(batchId) ?? 0) + row._count.id);
  }

  const sessionMap = new Map(
    sessionCounts.map((s) => [s.batchId, s._count.id]),
  );

  for (const batchId of batchIds) {
    const activeEnrollmentCount = enrollmentMap.get(batchId) ?? 0;
    const templateTotal = templateMap.get(batchId) ?? 0;
    const revenueExpected = templateTotal * activeEnrollmentCount;
    const revenueCollected = paidMap.get(batchId) ?? 0;
    const present = presentMap.get(batchId) ?? 0;
    const sessionTotal = sessionMap.get(batchId) ?? 0;
    const slots = activeEnrollmentCount * sessionTotal;
    const attendancePercent =
      slots > 0 ? Math.round((present / slots) * 100) : null;

    map.set(batchId, {
      revenueCollected,
      revenueExpected,
      attendancePercent,
      activeEnrollmentCount,
    });
  }

  return map;
}
