import { applyClassTimeColombo } from "@/lib/sessions/colombo-time";

/**
 * Generates session dates by iterating from startDate to endDate (inclusive),
 * collecting dates whose day-of-week is in classDayNumbers.
 *
 * Uses Colombo noon as the reference point for each day so that getDay() and
 * date comparisons are always correct regardless of server timezone (UTC).
 */
export function generateSessionDates(
  classDayNumbers: number[],
  startDate: Date,
  endDate: Date,
): Date[] {
  if (classDayNumbers.length === 0) return [];

  const days = new Set(classDayNumbers);
  const dates: Date[] = [];

  const startIso = toIsoDate(startDate);
  const endIso = toIsoDate(endDate);

  // Iterate using noon Colombo time so getDay() always matches the Colombo calendar day
  let current = new Date(`${startIso}T12:00:00+05:30`);
  const endMs = new Date(`${endIso}T12:00:00+05:30`).getTime();

  while (current.getTime() <= endMs) {
    if (days.has(current.getDay())) {
      dates.push(isoToDate(toIsoDate(current)));
    }
    current = new Date(current.getTime() + 86_400_000);
  }

  return dates;
}

/** ISO date string → start of that calendar day in Asia/Colombo */
export function isoToDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00+05:30`);
}

/**
 * Combines a calendar date with HH:mm class time in Asia/Colombo.
 */
export function applyClassTime(date: Date, classTime: string): Date {
  const calendarDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(date);
  return applyClassTimeColombo(calendarDate, classTime);
}

/** Returns ISO date-only string "YYYY-MM-DD" in Asia/Colombo */
export function toIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    date,
  );
}

export { applyClassTimeColombo };
