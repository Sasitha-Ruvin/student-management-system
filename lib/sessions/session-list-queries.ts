import type { Prisma, SessionStatus } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  colomboDayUtcRange,
  getColomboCalendarDate,
} from "@/lib/sessions/colombo-time";
import { splitStoredSessionNotes } from "@/lib/sessions/session-schedule-meta";
import { buildSessionTabWhere } from "@/lib/sessions/session-tab-filter";
import type {
  SessionListItem,
  SessionListPage,
  SessionListQuery,
  SessionListSummary,
} from "@/types/api/batch";

const ENROLLED_STATUSES = ["DROPPED", "UNASSIGNED"] as const;

async function getEnrollmentCountByBatch(
  batchIds: string[],
): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map();

  const rows = await prisma.enrollment.groupBy({
    by: ["batchId"],
    where: {
      batchId: { in: batchIds },
      status: { notIn: [...ENROLLED_STATUSES] },
    },
    _count: { id: true },
  });

  return new Map(
    rows
      .filter((r): r is typeof r & { batchId: string } => r.batchId != null)
      .map((r) => [r.batchId, r._count.id]),
  );
}

async function fetchSessionListSummary(
  branchId?: string,
): Promise<SessionListSummary> {
  const today = getColomboCalendarDate();
  const { start, end } = colomboDayUtcRange(today);

  const branchFilter: Prisma.SessionWhereInput = branchId
    ? { branchId }
    : {};

  const todaySessions = await prisma.session.findMany({
    where: {
      ...branchFilter,
      scheduledAt: { gte: start, lte: end },
      status: { in: ["SCHEDULED", "RESCHEDULED", "COMPLETED"] },
    },
    select: { batchId: true },
  });

  const batchIds = [...new Set(todaySessions.map((s) => s.batchId))];
  const enrollmentMap = await getEnrollmentCountByBatch(batchIds);

  let expectedAttendanceToday = 0;
  for (const s of todaySessions) {
    expectedAttendanceToday += enrollmentMap.get(s.batchId) ?? 0;
  }

  return {
    activeToday: todaySessions.length,
    expectedAttendanceToday,
  };
}

export async function fetchSessionListPage(
  query: SessionListQuery,
): Promise<SessionListPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 20));
  const tab = query.tab ?? "upcoming";
  const skip = (page - 1) * limit;

  const andClauses: Prisma.SessionWhereInput[] = [buildSessionTabWhere(tab)];

  if (query.batchId) {
    andClauses.push({ batchId: query.batchId });
  } else if (query.branchId) {
    andClauses.push({ batch: { branchId: query.branchId } });
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    andClauses.push({
      OR: [
        { batch: { batchCode: { contains: q, mode: "insensitive" } } },
        { batch: { name: { contains: q, mode: "insensitive" } } },
        { branch: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.SessionWhereInput = { AND: andClauses };

  const orderBy =
    tab === "upcoming"
      ? { scheduledAt: "asc" as const }
      : { scheduledAt: "desc" as const };

  const [sessions, total, summary] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        branch: { select: { name: true, location: true } },
        batch: {
          select: {
            id: true,
            batchCode: true,
            name: true,
            branchId: true,
            defaultClassTime: true,
          },
        },
        _count: { select: { attendances: true } },
      },
    }),
    prisma.session.count({ where }),
    fetchSessionListSummary(query.branchId),
  ]);

  const sessionIds = sessions.map((s) => s.id);
  const batchIds = [...new Set(sessions.map((s) => s.batchId))];

  const [presentCounts, enrollmentMap] = await Promise.all([
    sessionIds.length > 0
      ? prisma.attendance.groupBy({
          by: ["sessionId"],
          where: {
            sessionId: { in: sessionIds },
            attendanceStatus: "PRESENT",
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
    getEnrollmentCountByBatch(batchIds),
  ]);

  const presentMap = new Map(
    presentCounts.map((c) => [c.sessionId, c._count.id]),
  );

  const items: SessionListItem[] = sessions.map((s) => {
    const schedule = splitStoredSessionNotes(s.notes);
    return {
    id: s.id,
    sessionNumber: s.sessionNumber,
    scheduledAt: s.scheduledAt.toISOString(),
    scheduledEndAt: schedule.scheduledEndAt,
    branchId: s.branchId,
    branchName: s.branch.name,
    branchLocation: s.branch.location,
    status: s.status as SessionStatus,
    pin: s.pin,
    notes: schedule.notes,
    attendanceCount: s._count.attendances,
    presentCount: presentMap.get(s.id) ?? 0,
    isRelocated: s.branchId !== s.batch.branchId,
    batchId: s.batchId,
    batchCode: s.batch.batchCode,
    batchName: s.batch.name,
    defaultClassTime: s.batch.defaultClassTime,
    enrollmentCount: enrollmentMap.get(s.batchId) ?? 0,
    markedCount: s._count.attendances,
  };
  });

  return {
    items,
    total,
    page,
    limit,
    summary,
  };
}
