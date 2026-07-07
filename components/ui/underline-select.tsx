"use client";

import { Select, type SelectOption } from "@/components/ui/select";

type UnderlineSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  "aria-label"?: string;
};

/** Custom dropdown styled to match {@link UnderlineField} — use instead of native `<select>`. */
export function UnderlineSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  error,
  hint,
  className = "",
  "aria-label": ariaLabel,
}: UnderlineSelectProps) {
  return (
    <div className={["space-y-1", className].filter(Boolean).join(" ")}>
      <span className="block text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
        {label}
      </span>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        variant="underline"
        aria-label={ariaLabel ?? label}
        triggerClassName={
          error
            ? "border-destructive hover:border-destructive focus:border-destructive"
            : ""
        }
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}
