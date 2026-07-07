"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type UnderlineFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
} & (
  | ({ as?: "input" } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: "select" } & SelectHTMLAttributes<HTMLSelectElement>)
);

export function UnderlineField({
  label,
  error,
  hint,
  as = "input",
  className = "",
  children,
  ...props
}: UnderlineFieldProps) {
  const inputClass = [
    "w-full border-0 border-b border-secondary-400 bg-transparent py-2 text-sm text-primary-900",
    "placeholder:text-neutral-500 focus:border-primary-900 focus:outline-none",
    error ? "border-destructive" : "",
    className,
  ].join(" ");

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
        {label}
      </label>
      {as === "select" ? (
        <select
          className={inputClass}
          {...(props as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {children}
        </select>
      ) : (
        <input className={inputClass} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}
