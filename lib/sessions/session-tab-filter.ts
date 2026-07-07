import type { Prisma } from "@/app/generated/prisma";

export type SessionTab = "upcoming" | "completed";

export function buildSessionTabWhere(
  tab: SessionTab,
): Prisma.SessionWhereInput {
  const now = new Date();
  if (tab === "upcoming") {
    return {
      status: { in: ["SCHEDULED", "RESCHEDULED"] },
      scheduledAt: { gte: now },
    };
  }
  return {
    OR: [
      { status: { in: ["COMPLETED", "CANCELLED"] } },
      { scheduledAt: { lt: now } },
    ],
  };
}
