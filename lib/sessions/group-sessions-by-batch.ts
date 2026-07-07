import { groupSessionsByDay, type SessionDayGroup } from "@/lib/sessions/group-sessions-by-day";
import type { SessionListItem } from "@/types/api/batch";

export type SessionBatchGroup = {
  batchId: string;
  batchCode: string;
  batchName: string;
  dayGroups: SessionDayGroup[];
  earliestAt: string;
};

export function groupSessionsByBatch(items: SessionListItem[]): SessionBatchGroup[] {
  const byBatch = new Map<string, SessionListItem[]>();

  for (const item of items) {
    const list = byBatch.get(item.batchId) ?? [];
    list.push(item);
    byBatch.set(item.batchId, list);
  }

  const groups: SessionBatchGroup[] = [];

  for (const batchItems of byBatch.values()) {
    const first = batchItems[0]!;
    const dayGroups = groupSessionsByDay(batchItems);
    const earliestAt =
      batchItems
        .map((s) => s.scheduledAt)
        .sort((a, b) => a.localeCompare(b))[0] ?? first.scheduledAt;

    groups.push({
      batchId: first.batchId,
      batchCode: first.batchCode,
      batchName: first.batchName,
      dayGroups,
      earliestAt,
    });
  }

  return groups.sort((a, b) => a.earliestAt.localeCompare(b.earliestAt));
}
