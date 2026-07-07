import { getColomboCalendarDate } from "@/lib/sessions/colombo-time";
import type { SessionListItem } from "@/types/api/batch";

export type SessionDayGroup = {
  label: string;
  dateKey: string;
  items: SessionListItem[];
};

function formatDayLabel(dateKey: string, todayKey: string): string {
  const tomorrow = new Date(`${todayKey}T12:00:00+05:30`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getColomboCalendarDate(tomorrow);

  const date = new Date(`${dateKey}T12:00:00+05:30`);
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Colombo",
  });

  if (dateKey === todayKey) return `Today, ${formatted}`;
  if (dateKey === tomorrowKey) return `Tomorrow, ${formatted}`;
  return formatted;
}

export function groupSessionsByDay(items: SessionListItem[]): SessionDayGroup[] {
  const todayKey = getColomboCalendarDate();
  const map = new Map<string, SessionListItem[]>();

  for (const item of items) {
    const dateKey = getColomboCalendarDate(new Date(item.scheduledAt));
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, groupItems]) => ({
      dateKey,
      label: formatDayLabel(dateKey, todayKey),
      items: groupItems,
    }));
}
