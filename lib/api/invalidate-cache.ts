import { revalidateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/api/cache-tags";

const REVALIDATE_PROFILE = "max";

/** No-op safety net if server caching is reintroduced later. */
export function invalidateBranches(branchId?: string) {
  revalidateTag(CACHE_TAGS.branches, REVALIDATE_PROFILE);
  if (branchId) {
    revalidateTag(CACHE_TAGS.branch(branchId), REVALIDATE_PROFILE);
  }
}

export function invalidateBatches(batchId?: string) {
  revalidateTag(CACHE_TAGS.batches, REVALIDATE_PROFILE);
  if (batchId) {
    revalidateTag(CACHE_TAGS.batch(batchId), REVALIDATE_PROFILE);
  }
}

export function invalidateStudents() {
  revalidateTag(CACHE_TAGS.students, REVALIDATE_PROFILE);
}

export function invalidateSessions() {
  revalidateTag(CACHE_TAGS.sessions, REVALIDATE_PROFILE);
}

export function invalidateAlumni() {
  revalidateTag(CACHE_TAGS.alumni, REVALIDATE_PROFILE);
}

export function invalidateSettings() {
  revalidateTag(CACHE_TAGS.settings, REVALIDATE_PROFILE);
  revalidateTag(CACHE_TAGS.paymentPlans, REVALIDATE_PROFILE);
}

export function invalidateDashboard() {
  revalidateTag(CACHE_TAGS.dashboard, REVALIDATE_PROFILE);
}

/** Call after enrollments, payments, or attendance change list metrics. */
export function invalidateOperationalData(options?: {
  branchId?: string;
  batchId?: string;
}) {
  invalidateBatches(options?.batchId);
  invalidateBranches(options?.branchId);
  invalidateSessions();
  invalidateStudents();
  invalidateDashboard();
}
