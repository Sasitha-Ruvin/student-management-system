export function formatBatchDateRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const start = new Date(startIso).toLocaleDateString(undefined, opts);
  const end = new Date(endIso).toLocaleDateString(undefined, opts);
  return `${start} — ${end}`;
}
