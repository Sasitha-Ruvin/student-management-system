import {
  colomboDatetimeLocalToUtc,
  utcToColomboDatetimeLocal,
} from "@/lib/sessions/colombo-time";

/** UTC ISO → datetime-local in Asia/Colombo */
export function toDatetimeLocalValue(iso: string): string {
  return utcToColomboDatetimeLocal(iso);
}

/** datetime-local form value → UTC ISO for storage */
export function parseColomboFormDatetime(localValue: string): Date {
  return colomboDatetimeLocalToUtc(localValue);
}

export function parseOptionalEndTime(
  startLocal: string,
  endLocal: string,
): { end: Date | null; error: string | null } {
  if (!endLocal.trim()) return { end: null, error: null };
  const end = colomboDatetimeLocalToUtc(endLocal);
  if (isNaN(end.getTime())) return { end: null, error: "Invalid end time" };
  const start = colomboDatetimeLocalToUtc(startLocal);
  if (!isNaN(start.getTime()) && end.getTime() <= start.getTime()) {
    return { end: null, error: "End time must be after start time" };
  }
  return { end, error: null };
}
