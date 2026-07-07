export const BRANCH_DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

export const BRANCH_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type ClassDayInput = {
  dayOfWeek: number;
};

export function validateClassDay(input: ClassDayInput): string | null {
  const { dayOfWeek } = input;

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return "dayOfWeek must be an integer between 0 and 6";
  }

  return null;
}

export function validateClassDays(classDays: ClassDayInput[]): string | null {
  if (classDays.length === 0) {
    return "At least one class day is required";
  }

  for (const day of classDays) {
    const error = validateClassDay(day);
    if (error) return error;
  }

  const keys = classDays.map((d) => d.dayOfWeek);
  if (new Set(keys).size !== keys.length) {
    return "Each day of week can only be added once";
  }

  return null;
}
