import type { BatchStatus, Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  toAttendanceStatusValue,
  toBatchDetail,
  toBatchFinanceSummary,
  toBatchListItem,
  toBatchSessionRow,
  toBatchStudentRow,
} from "@/lib/batches/batch-mappers";
import { fetchBatchListMetrics } from "@/lib/batches/batch-list-metrics";
import { splitStoredSessionNotes } from "@/lib/sessions/session-schedule-meta";
import {
  studentDisplayFields,
  STUDENT_PII_SELECT,
} from "@/lib/students/student-pii";
import type {
  AttendanceGrid,
  BatchDetail,
  BatchFinanceSummary,
  BatchListPage,
  BatchListSummary,
  BatchSessionRow,
  BatchStudentRow,
  SessionDetail,
  SessionAttendanceRow,
} from "@/types/api/batch";

// ── Query types ──────────────────────────────────────────────────

export type BatchListQuery = {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: "all" | "OPEN" | "ACTIVE" | "COMPLETED";
  search?: string;
};

// ── Shared includes/selects ───────────────────────────────────────

const batchBranchSelect = {
  id: true,
  name: true,
  branchCode: true,
} as const;

const batchBaseInclude = {
  branch: { select: batchBranchSelect },
  _count: {
    select: {
      enrollments: true,
      sessions: true,
    },
  },
} as const;

function buildBatchWhere(query: BatchListQuery): Prisma.BatchWhereInput {
  const where: Prisma.BatchWhereInput = {};

  if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.status && query.status !== "all") {
    where.status = query.status as "OPEN" | "ACTIVE" | "COMPLETED";
  }

  if (query.search?.trim()) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { batchCode: { contains: s, mode: "insensitive" } },
    ];
  }

  return where;
}

const EMPTY_SUMMARY: BatchListSummary = {
  activeBatchCount: 0,
  totalStudents: 0,
  avgAttendancePercent: null,
  totalRevenueCollected: 0,
};

export async function fetchBatchListSummary(
  query: BatchListQuery,
): Promise<BatchListSummary> {
  const where = buildBatchWhere(query);
  const activeStatuses: BatchStatus[] = ["OPEN", "ACTIVE"];
  const summaryWhere: Prisma.BatchWhereInput = {
    ...where,
    status: { in: activeStatuses },
  };

  const batchIds = await prisma.batch.findMany({
    where: summaryWhere,
    select: { id: true },
  });

  if (batchIds.length === 0) {
    const activeBatchCount = await prisma.batch.count({ where: summaryWhere });
    return { ...EMPTY_SUMMARY, activeBatchCount };
  }

  const ids = batchIds.map((b) => b.id);
  const metricsMap = await fetchBatchListMetrics(ids);

  let totalStudents = 0;
  let totalRevenueCollected = 0;
  let attendanceSum = 0;
  let attendanceCount = 0;

  for (const m of metricsMap.values()) {
    totalStudents += m.activeEnrollmentCount;
    totalRevenueCollected += m.revenueCollected;
    if (m.attendancePercent !== null) {
      attendanceSum += m.attendancePercent;
      attendanceCount++;
    }
  }

  return {
    activeBatchCount: batchIds.length,
    totalStudents,
    avgAttendancePercent:
      attendanceCount > 0 ? Math.round(attendanceSum / attendanceCount) : null,
    totalRevenueCollected,
  };
}

// ── List ──────────────────────────────────────────────────────────

export async function fetchBatchListPage(query: BatchListQuery): Promise<BatchListPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildBatchWhere(query);

  const [batches, total, summary] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: batchBaseInclude,
      orderBy: [{ startDate: "desc" }],
      skip,
      take: limit,
    }),
    prisma.batch.count({ where }),
    fetchBatchListSummary(query),
  ]);

  const batchIds = batches.map((b) => b.id);

  const [completedCounts, metricsMap] = await Promise.all([
    batchIds.length > 0
      ? prisma.session.groupBy({
          by: ["batchId"],
          where: {
            batchId: { in: batchIds },
            status: { in: ["COMPLETED", "CANCELLED"] },
          },
          _count: { id: true },
        })
      : Promise.resolve([]),
    fetchBatchListMetrics(batchIds),
  ]);

  const completedMap = new Map(
    completedCounts.map((c) => [c.batchId, c._count.id]),
  );

  return {
    items: batches.map((b) => {
      const m = metricsMap.get(b.id);
      return toBatchListItem(
        b,
        completedMap.get(b.id) ?? 0,
        m
          ? {
              activeEnrollmentCount: m.activeEnrollmentCount,
              revenueCollected: m.revenueCollected,
              revenueExpected: m.revenueExpected,
              attendancePercent: m.attendancePercent,
            }
          : undefined,
      );
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary,
  };
}

// ── Detail ────────────────────────────────────────────────────────

export async function fetchBatchDetail(id: string): Promise<BatchDetail | null> {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      ...batchBaseInclude,
      installmentTemplates: {
        orderBy: { order: "asc" },
      },
      paymentPlan: {
        select: { id: true, name: true, oneTimeDiscountAmount: true },
      },
    },
  });

  if (!batch) return null;

  const [completedCount, scheduledSessionCount, sessionBounds, metricsMap] =
    await Promise.all([
    prisma.session.count({
      where: {
        batchId: id,
        status: { in: ["COMPLETED", "CANCELLED"] },
      },
    }),
    prisma.session.count({
      where: { batchId: id, status: "SCHEDULED" },
    }),
    prisma.session.aggregate({
      where: { batchId: id },
      _min: { scheduledAt: true },
      _max: { scheduledAt: true },
    }),
    fetchBatchListMetrics([id]),
  ]);

  const m = metricsMap.get(id);
  const detail = toBatchDetail(
    batch,
    completedCount,
    scheduledSessionCount,
    m
      ? {
          activeEnrollmentCount: m.activeEnrollmentCount,
          revenueCollected: m.revenueCollected,
          revenueExpected: m.revenueExpected,
          attendancePercent: m.attendancePercent,
        }
      : undefined,
  );

  return {
    ...detail,
    firstSessionScheduledAt:
      sessionBounds._min.scheduledAt?.toISOString() ?? null,
    lastSessionScheduledAt:
      sessionBounds._max.scheduledAt?.toISOString() ?? null,
  };
}

// ── Sessions tab ──────────────────────────────────────────────────

export async function fetchBatchSessions(batchId: string): Promise<BatchSessionRow[]> {
  const sessions = await prisma.session.findMany({
    where: { batchId },
    include: {
      branch: { select: { name: true } },
      batch: { select: { branchId: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: { sessionNumber: "asc" },
  });

  // Fetch present counts per session in bulk
  const sessionIds = sessions.map((s) => s.id);
  const presentCounts = sessionIds.length > 0
    ? await prisma.attendance.groupBy({
        by: ["sessionId"],
        where: {
          sessionId: { in: sessionIds },
          attendanceStatus: "PRESENT",
        },
        _count: { id: true },
      })
    : [];

  const presentMap = new Map(presentCounts.map((c) => [c.sessionId, c._count.id]));

  return sessions.map((s) =>
    toBatchSessionRow({ ...s, presentCount: presentMap.get(s.id) ?? 0 }),
  );
}

// ── Students tab ──────────────────────────────────────────────────

export async function fetchBatchStudents(batchId: string): Promise<BatchStudentRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { batchId },
    include: {
      student: {
        select: { id: true, modelCode: true, ...STUDENT_PII_SELECT },
      },
      installments: {
        select: { amount: true, paidAmount: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return enrollments.map((e) => {
    const totalOwed = e.installments.reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    );
    const totalPaid = e.installments.reduce(
      (sum, i) => sum + Number(i.paidAmount),
      0,
    );

    return toBatchStudentRow({
      id: e.id,
      status: e.status,
      regFeePaid: e.regFeePaid,
      paymentPath: e.paymentPath,
      student: studentDisplayFields(e.student),
      totalPaid,
      totalOwed,
    });
  });
}

// ── Attendance grid ───────────────────────────────────────────────

export async function fetchAttendanceGrid(batchId: string): Promise<AttendanceGrid> {
  const [sessions, enrollments, attendanceRows] = await Promise.all([
    prisma.session.findMany({
      where: { batchId },
      select: {
        id: true,
        sessionNumber: true,
        scheduledAt: true,
        status: true,
      },
      orderBy: { sessionNumber: "asc" },
    }),
    prisma.enrollment.findMany({
      where: {
        batchId,
        status: { notIn: ["DROPPED", "UNASSIGNED"] },
      },
      select: {
        id: true,
        student: { select: { id: true, modelCode: true, ...STUDENT_PII_SELECT } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        session: { batchId },
        student: {
          enrollments: {
            some: { batchId },
          },
        },
      },
      select: {
        studentId: true,
        sessionId: true,
        attendanceStatus: true,
      },
    }),
  ]);

  const cells: AttendanceGrid["cells"] = {};

  for (const row of attendanceRows) {
    if (!cells[row.studentId]) cells[row.studentId] = {};
    cells[row.studentId][row.sessionId] = toAttendanceStatusValue(
      row.attendanceStatus,
    );
  }

  return {
    students: enrollments.map((e) => {
      const display = studentDisplayFields(e.student);
      return {
        studentId: display.id,
        enrollmentId: e.id,
        fullName: display.fullName,
        modelCode: display.modelCode,
      };
    }),
    sessions: sessions.map((s) => ({
      sessionId: s.id,
      sessionNumber: s.sessionNumber,
      scheduledAt: s.scheduledAt.toISOString(),
      status: s.status as AttendanceGrid["sessions"][number]["status"],
    })),
    cells,
  };
}

// ── Finance tab ───────────────────────────────────────────────────

export async function fetchBatchFinance(batchId: string): Promise<BatchFinanceSummary> {
  const [templates, enrollmentCount] = await Promise.all([
    prisma.installmentTemplate.findMany({
      where: { batchId },
      orderBy: { order: "asc" },
    }),
    prisma.enrollment.count({
      where: {
        batchId,
        status: { notIn: ["DROPPED", "UNASSIGNED"] },
      },
    }),
  ]);

  if (templates.length === 0) {
    return {
      enrollmentCount,
      totalExpected: 0,
      totalCollected: 0,
      outstanding: 0,
      installments: [],
    };
  }

  // Sum paid amounts across all enrollments' installments per template label+order
  const paidSums = await prisma.installment.groupBy({
    by: ["label", "order"],
    where: {
      enrollment: { batchId, status: { notIn: ["DROPPED", "UNASSIGNED"] } },
    },
    _sum: { paidAmount: true },
  });

  const paidMap = new Map(
    paidSums.map((s) => [`${s.label}|${s.order}`, Number(s._sum.paidAmount ?? 0)]),
  );

  const templatesWithCollected = templates.map((t) => ({
    id: t.id,
    label: t.label,
    dueDate: t.dueDate,
    order: t.order,
    amount: t.amount,
    collectedSum: paidMap.get(`${t.label}|${t.order}`) ?? 0,
  }));

  return toBatchFinanceSummary({ enrollmentCount, templates: templatesWithCollected });
}

// ── Session detail ────────────────────────────────────────────────

export async function fetchSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      batch: {
        select: {
          id: true,
          batchCode: true,
          name: true,
          branchId: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
      attendances: {
        include: {
          student: {
            select: {
              id: true,
              modelCode: true,
              photoUrl: true,
              ...STUDENT_PII_SELECT,
              enrollments: {
                where: { status: "ACTIVE" },
                select: {
                  batch: { select: { branchId: true } },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { markedAt: "asc" },
      },
    },
  });

  if (!session) return null;

  // Fetch enrolled active students for "unmarked" calculation
  const enrollments = await prisma.enrollment.findMany({
    where: {
      batchId: session.batchId,
      status: { notIn: ["DROPPED", "UNASSIGNED"] },
    },
    select: {
      student: {
        select: {
          id: true,
          modelCode: true,
          photoUrl: true,
          ...STUDENT_PII_SELECT,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const markedStudentIds = new Set(session.attendances.map((a) => a.studentId));

  const unmarkedStudents = enrollments
    .filter((e) => !markedStudentIds.has(e.student.id))
    .map((e) => {
      const display = studentDisplayFields(e.student);
      return {
        studentId: display.id,
        fullName: display.fullName,
        modelCode: display.modelCode,
        photoUrl: e.student.photoUrl,
      };
    });

  const attendanceRows: SessionAttendanceRow[] = session.attendances.map((a) => {
    const studentActiveBranchId =
      a.student.enrollments[0]?.batch?.branchId ?? null;
    const isCrossBranch =
      studentActiveBranchId !== null &&
      studentActiveBranchId !== session.branchId;
    const display = studentDisplayFields(a.student);

    return {
      attendanceId: a.id,
      studentId: a.studentId,
      fullName: display.fullName,
      modelCode: display.modelCode,
      photoUrl: a.student.photoUrl,
      status: toAttendanceStatusValue(a.attendanceStatus) as SessionAttendanceRow["status"],
      source: a.source as "ADMIN" | "STUDENT",
      markedAt: a.markedAt.toISOString(),
      notes: a.notes,
      isCrossBranch,
    };
  });

  const summary = {
    present: attendanceRows.filter((r) => r.status === "PRESENT").length,
    absent: attendanceRows.filter((r) => r.status === "ABSENT").length,
    late: attendanceRows.filter((r) => r.status === "LATE").length,
    unmarked: unmarkedStudents.length,
  };

  const schedule = splitStoredSessionNotes(session.notes);

  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    scheduledAt: session.scheduledAt.toISOString(),
    scheduledEndAt: schedule.scheduledEndAt,
    status: session.status as SessionDetail["status"],
    pin: session.pin,
    notes: schedule.notes,
    isRelocated: session.branchId !== session.batch.branchId,
    batchId: session.batchId,
    batchCode: session.batch.batchCode,
    batchName: session.batch.name,
    batchBranchId: session.batch.branchId,
    branchId: session.branchId,
    branchName: session.branch.name,
    branchLocation: session.branch.location,
    attendances: attendanceRows,
    unmarkedStudents,
    attendanceSummary: summary,
  };
}
