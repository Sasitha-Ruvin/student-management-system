export const COLOMBO_TZ = "Asia/Colombo";
const COLOMBO_OFFSET = "+05:30";

/** Calendar date in Colombo as YYYY-MM-DD */
export function getColomboCalendarDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBO_TZ }).format(date);
}

/** UTC range covering one calendar day in Asia/Colombo */
export function colomboDayUtcRange(calendarDate: string): { start: Date; end: Date } {
  return {
    start: new Date(`${calendarDate}T00:00:00${COLOMBO_OFFSET}`),
    end: new Date(`${calendarDate}T23:59:59.999${COLOMBO_OFFSET}`),
  };
}

/** datetime-local value (no zone) interpreted as Sri Lanka wall time → UTC instant */
export function colomboDatetimeLocalToUtc(localValue: string): Date {
  const trimmed = localValue.trim();
  if (!trimmed) return new Date(NaN);
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  return new Date(`${withSeconds}${COLOMBO_OFFSET}`);
}

/** UTC instant → datetime-local string in Sri Lanka */
export function utcToColomboDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COLOMBO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** YYYY-MM-DD date + HH:mm class time in Colombo → UTC instant */
export function applyClassTimeColombo(calendarDate: string, classTime: string): Date {
  const datePart = calendarDate.slice(0, 10);
  const [hours, minutes] = classTime.split(":").map(Number);
  const hh = String(hours ?? 9).padStart(2, "0");
  const mm = String(minutes ?? 0).padStart(2, "0");
  return new Date(`${datePart}T${hh}:${mm}:00${COLOMBO_OFFSET}`);
}

export function formatColomboTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: COLOMBO_TZ,
  });
}

export function formatColomboDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: COLOMBO_TZ,
  });
}

export function formatColomboDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(iso).toLocaleString("en-LK", {
    timeZone: COLOMBO_TZ,
    ...options,
  });
}

export function isSameColomboCalendarDay(a: Date, b: Date): boolean {
  return getColomboCalendarDate(a) === getColomboCalendarDate(b);
}
