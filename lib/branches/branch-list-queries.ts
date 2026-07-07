import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { BranchListItem } from "@/types/api/branch";

export type BranchListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: "all" | "active" | "inactive";
  sort?: "name" | "students" | "batches";
};

export type BranchListSummary = {
  activeBranchCount: number;
  totalStudents: number;
  activeBatchCount: number;
};

export type BranchListPage = {
  items: BranchListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: BranchListSummary;
};

export type BranchPickerItem = {
  id: string;
  name: string;
  branchCode: string;
};

function buildWhere(query: BranchListQuery): Prisma.BranchWhereInput {
  const where: Prisma.BranchWhereInput = {};

  if (query.status === "active") {
    where.isActive = true;
  } else if (query.status === "inactive") {
    where.isActive = false;
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { branchCode: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

async function getStatsMaps(branchIds: string[]) {
  const batchCountMap = new Map<string, number>();
  const studentCountMap = new Map<string, number>();

  if (branchIds.length === 0) {
    return { batchCountMap, studentCountMap };
  }

  const [batchGroups, enrollmentGroups] = await Promise.all([
    prisma.batch.groupBy({
      by: ["branchId"],
      where: { branchId: { in: branchIds }, status: "OPEN" },
      _count: { _all: true },
    }),
    prisma.enrollment.groupBy({
      by: ["batchId"],
      where: {
        status: "ACTIVE",
        batchId: { not: null },
        batch: { status: "OPEN", branchId: { in: branchIds } },
      },
      _count: { _all: true },
    }),
  ]);

  for (const row of batchGroups) {
    batchCountMap.set(row.branchId, row._count._all);
  }

  const enrollmentBatchIds = enrollmentGroups
    .map((row) => row.batchId)
    .filter((id): id is string => id != null);

  const batchToBranch =
    enrollmentBatchIds.length > 0
      ? new Map(
          (
            await prisma.batch.findMany({
              where: { id: { in: enrollmentBatchIds } },
              select: { id: true, branchId: true },
            })
          ).map((b) => [b.id, b.branchId]),
        )
      : new Map<string, string>();

  for (const row of enrollmentGroups) {
    if (!row.batchId) continue;
    const branchId = batchToBranch.get(row.batchId);
    if (!branchId) continue;
    studentCountMap.set(
      branchId,
      (studentCountMap.get(branchId) ?? 0) + row._count._all,
    );
  }

  return { batchCountMap, studentCountMap };
}

async function fetchBranchSummary(
  where: Prisma.BranchWhereInput,
): Promise<BranchListSummary> {
  const branches = await prisma.branch.findMany({
    where,
    select: { id: true, isActive: true },
  });

  const branchIds = branches.map((b) => b.id);
  const { batchCountMap, studentCountMap } = await getStatsMaps(branchIds);

  let totalStudents = 0;
  let activeBatchCount = 0;
  for (const id of branchIds) {
    totalStudents += studentCountMap.get(id) ?? 0;
    activeBatchCount += batchCountMap.get(id) ?? 0;
  }

  return {
    activeBranchCount: branches.filter((b) => b.isActive).length,
    totalStudents,
    activeBatchCount,
  };
}

function toListItem(
  branch: {
    id: string;
    branchCode: string;
    name: string;
    location: string;
    isActive: boolean;
    createdAt: Date;
  },
  batchCountMap: Map<string, number>,
  studentCountMap: Map<string, number>,
): BranchListItem {
  return {
    id: branch.id,
    branchCode: branch.branchCode,
    name: branch.name,
    location: branch.location,
    isActive: branch.isActive,
    activeBatchCount: batchCountMap.get(branch.id) ?? 0,
    activeStudentCount: studentCountMap.get(branch.id) ?? 0,
    createdAt: branch.createdAt.toISOString(),
  };
}

export async function fetchBranchListItemById(
  branchId: string,
): Promise<BranchListItem | null> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      branchCode: true,
      name: true,
      location: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!branch) {
    return null;
  }

  const { batchCountMap, studentCountMap } = await getStatsMaps([branchId]);
  return toListItem(branch, batchCountMap, studentCountMap);
}

export async function fetchBranchPicker(): Promise<BranchPickerItem[]> {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, branchCode: true },
  });
}

export async function fetchBranchListPage(
  query: BranchListQuery,
): Promise<BranchListPage> {
  const page = Math.max(1, query.page);
  const limit = Math.min(100, Math.max(1, query.limit));
  const where = buildWhere(query);

  const sort = query.sort ?? "name";

  if (sort === "name") {
    const skip = (page - 1) * limit;
    const [branches, total, summary] = await Promise.all([
      prisma.branch.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          branchCode: true,
          name: true,
          location: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.branch.count({ where }),
      fetchBranchSummary(where),
    ]);

    const branchIds = branches.map((b) => b.id);
    const { batchCountMap, studentCountMap } = await getStatsMaps(branchIds);

    return {
      items: branches.map((b) => toListItem(b, batchCountMap, studentCountMap)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary,
    };
  }

  const allBranches = await prisma.branch.findMany({
    where,
    select: {
      id: true,
      branchCode: true,
      name: true,
      location: true,
      isActive: true,
      createdAt: true,
    },
  });

  const branchIds = allBranches.map((b) => b.id);
  const { batchCountMap, studentCountMap } = await getStatsMaps(branchIds);

  const ranked = allBranches
    .map((b) => ({
      branch: b,
      activeStudentCount: studentCountMap.get(b.id) ?? 0,
      activeBatchCount: batchCountMap.get(b.id) ?? 0,
    }))
    .sort((a, b) => {
      if (sort === "students") {
        return b.activeStudentCount - a.activeStudentCount;
      }
      return b.activeBatchCount - a.activeBatchCount;
    });

  const total = ranked.length;
  const skip = (page - 1) * limit;
  const pageRows = ranked.slice(skip, skip + limit);

  let totalStudents = 0;
  let activeBatchCount = 0;
  for (const id of branchIds) {
    totalStudents += studentCountMap.get(id) ?? 0;
    activeBatchCount += batchCountMap.get(id) ?? 0;
  }

  return {
    items: pageRows.map(({ branch }) =>
      toListItem(branch, batchCountMap, studentCountMap),
    ),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      activeBranchCount: allBranches.filter((b) => b.isActive).length,
      totalStudents,
      activeBatchCount,
    },
  };
}
