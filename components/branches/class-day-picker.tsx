"use client";

import {
  BRANCH_DAY_NAMES,
  BRANCH_DAY_OPTIONS,
} from "@/lib/branches/class-day-utils";

type ClassDayPickerProps = {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  disabledDays?: number[];
};

export function ClassDayPicker({
  selectedDays,
  onChange,
  disabledDays = [],
}: ClassDayPickerProps) {
  function toggleDay(dayOfWeek: number) {
    if (disabledDays.includes(dayOfWeek)) return;

    if (selectedDays.includes(dayOfWeek)) {
      onChange(selectedDays.filter((d) => d !== dayOfWeek));
    } else {
      onChange([...selectedDays, dayOfWeek].sort((a, b) => a - b));
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BRANCH_DAY_OPTIONS.map((option) => {
        const day = Number(option.value);
        const isSelected = selectedDays.includes(day);
        const isDisabled = disabledDays.includes(day);

        return (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            onClick={() => toggleDay(day)}
            aria-pressed={isSelected}
            className={[
              "min-h-11 rounded-full px-4 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]",
              isSelected
                ? "bg-primary-900 text-tertiary-100"
                : "border border-secondary-400 bg-tertiary-100 text-neutral-800 hover:border-secondary-600 hover:bg-secondary-100",
              isDisabled ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            {BRANCH_DAY_NAMES[day]}
          </button>
        );
      })}
    </div>
  );
}
