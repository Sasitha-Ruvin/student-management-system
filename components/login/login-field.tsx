"use client";

import type { LucideIcon } from "@/lib/icons";

type LoginFieldProps = {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon: LucideIcon;
  labelAction?: React.ReactNode;
  trailing?: React.ReactNode;
};

export function LoginField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  icon: Icon,
  labelAction,
  trailing,
}: LoginFieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-700"
        >
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          strokeWidth={1.5}
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-secondary-400 bg-white py-3.5 pl-11 text-sm text-primary-900 placeholder:text-neutral-400 outline-none transition focus:border-primary-900 focus:ring-1 focus:ring-primary-900 ${
            trailing ? "pr-11" : "pr-4"
          }`}
        />
        {trailing}
      </div>
    </div>
  );
}
