import { prisma } from "@/lib/prisma";
import type { BranchDetail } from "@/types/api/branch";

export async function fetchBranchDetail(
  branchId: string,
): Promise<BranchDetail | null> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [branch, paymentSum, upcomingSession, scheduledSessionCount] =
    await Promise.all([
      prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          branchCode: true,
          name: true,
          location: true,
          isActive: true,
          createdAt: true,
          classDays: {
            orderBy: { dayOfWeek: "asc" },
            select: { id: true, dayOfWeek: true },
          },
          batches: {
            where: { status: "OPEN" },
            select: {
              id: true,
              batchCode: true,
              name: true,
              status: true,
              _count: {
                select: {
                  enrollments: { where: { status: "ACTIVE" } },
                },
              },
            },
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: startOfYear, lte: endOfYear },
          installmentId: { not: null },
          installment: {
            enrollment: {
              batch: { branchId },
            },
          },
        },
        _sum: { amount: true },
      }),
      prisma.session.findFirst({
        where: {
          branchId,
          status: "SCHEDULED",
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true },
      }),
      prisma.session.count({
        where: { branchId, status: "SCHEDULED" },
      }),
    ]);

  if (!branch) {
    return null;
  }

  const activeBatchCount = branch.batches.length;
  const activeStudentCount = branch.batches.reduce(
    (sum, batch) => sum + batch._count.enrollments,
    0,
  );

  return {
    id: branch.id,
    branchCode: branch.branchCode,
    name: branch.name,
    location: branch.location,
    isActive: branch.isActive,
    activeBatchCount,
    activeStudentCount,
    createdAt: branch.createdAt.toISOString(),
    classDays: branch.classDays,
    stats: {
      totalEnrolled: activeStudentCount,
      feesCollectedThisYear: Number(paymentSum._sum.amount ?? 0),
      nextSessionDate: upcomingSession?.scheduledAt.toISOString() ?? null,
    },
    activeBatches: branch.batches.map((batch) => ({
      id: batch.id,
      batchCode: batch.batchCode,
      name: batch.name,
      status: batch.status,
      enrollmentCount: batch._count.enrollments,
    })),
    hasScheduledSessions: scheduledSessionCount > 0,
  };
}
