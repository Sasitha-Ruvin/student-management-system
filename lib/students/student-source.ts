import type { StudentSource } from "@/types/api/student";

const SOURCE_LABELS: Record<StudentSource, string> = {
  MANUAL: "Manual",
  WEBHOOK: "Webhook",
  WEBSITE: "Website",
};

/** Temporary placeholder assigned at website registration; replaced on batch approval. */
export function isPendingWebsiteModelCode(modelCode: string): boolean {
  return modelCode.startsWith("WEBSITE-");
}

export function isWebsiteSource(source: StudentSource | string): boolean {
  return source === "WEBSITE";
}

/** Website applicants still awaiting admin approval (batch + real model code). */
export function needsModelCodeOnApproval(
  source: StudentSource | string,
  modelCode: string,
): boolean {
  return isWebsiteSource(source) && isPendingWebsiteModelCode(modelCode);
}

export function studentSourceLabel(source: StudentSource | string): string {
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source as StudentSource];
  }
  return String(source);
}
