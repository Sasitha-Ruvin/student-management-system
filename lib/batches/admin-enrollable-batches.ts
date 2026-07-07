import type { BatchListItem } from "@/types/api/batch";

/** Batches an admin can assign students to (all except completed). */
export function filterAdminEnrollableBatches(
  batches: BatchListItem[],
): BatchListItem[] {
  return batches.filter((b) => b.status !== "COMPLETED");
}
