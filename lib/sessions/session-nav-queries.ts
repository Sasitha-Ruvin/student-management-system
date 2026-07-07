import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { buildSessionTabWhere, type SessionTab } from "@/lib/sessions/session-tab-filter";
import type {
  SessionBatchNavItem,
  SessionBranchNavItem,
} from "@/types/api/batch";

function branchSearchWhere(search: string): Prisma.BranchWhereInput {
  const q = search.trim();
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { branchCode: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ],
  };
}

function batchSearchWhere(search: string): Prisma.BatchWhereInput {
  const q = search.trim();
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { batchCode: { contains: q, mode: "insensitive" } },
    ],
  };
}

export async function fetchSessionBranchNav(
  tab: SessionTab,
  search?: string,
): Promise<SessionBranchNavItem[]> {
  const trimmedSearch = search?.trim();

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ...(trimmedSearch ? branchSearchWhere(trimmedSearch) : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      branchCode: true,
      location: true,
    },
  });

  if (branches.length === 0) {
    return [];
  }

  const branchIds = branches.map((b) => b.id);

  const sessionGroups = await prisma.session.groupBy({
    by: ["batchId"],
    where: {
      AND: [
        buildSessionTabWhere(tab),
        { batch: { branchId: { in: branchIds } } },
      ],
    },
    _count: { id: true },
  });

  const batchIds = sessionGroups.map((g) => g.batchId);
  const batchToBranch =
    batchIds.length > 0
      ? new Map(
          (
            await prisma.batch.findMany({
              where: { id: { in: batchIds } },
              select: { id: true, branchId: true },
            })
          ).map((b) => [b.id, b.branchId]),
        )
      : new Map<string, string>();

  const countByBranch = new Map<string, number>();
  for (const row of sessionGroups) {
    const branchId = batchToBranch.get(row.batchId);
    if (!branchId) continue;
    countByBranch.set(
      branchId,
      (countByBranch.get(branchId) ?? 0) + row._count.id,
    );
  }

  return branches.map((b) => ({
    id: b.id,
    name: b.name,
    branchCode: b.branchCode,
    location: b.location,
    sessionCount: countByBranch.get(b.id) ?? 0,
  }));
}

export async function fetchSessionBatchNav(
  branchId: string,
  tab: SessionTab,
  search?: string,
): Promise<SessionBatchNavItem[]> {
  const trimmedSearch = search?.trim();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true },
  });

  if (!branch) {
    return [];
  }

  const batches = await prisma.batch.findMany({
    where: {
      branchId,
      ...(trimmedSearch ? batchSearchWhere(trimmedSearch) : {}),
    },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      batchCode: true,
      name: true,
      status: true,
    },
  });

  if (batches.length === 0) {
    return [];
  }

  const batchIds = batches.map((b) => b.id);

  const sessionGroups = await prisma.session.groupBy({
    by: ["batchId"],
    where: {
      AND: [buildSessionTabWhere(tab), { batchId: { in: batchIds } }],
    },
    _count: { id: true },
  });

  const countByBatch = new Map(
    sessionGroups.map((g) => [g.batchId, g._count.id]),
  );

  return batches.map((b) => ({
    id: b.id,
    batchCode: b.batchCode,
    name: b.name,
    status: b.status as SessionBatchNavItem["status"],
    sessionCount: countByBatch.get(b.id) ?? 0,
  }));
}
