"use client";

import { useState } from "react";

import { generatePortalPassword } from "@/lib/auth/portal-password";
import { Eye, EyeOff, Wand2 } from "@/lib/icons";

type PortalPasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
};

export function PortalPasswordField({
  value,
  onChange,
  id = "portal-password",
  label = "Password",
}: PortalPasswordFieldProps) {
  const [visible, setVisible] = useState(true);

  function handleGenerate() {
    onChange(generatePortalPassword());
    setVisible(true);
  }

  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-secondary-300/60 text-neutral-600 hover:bg-secondary-100/60"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-primary-900 px-3 text-xs font-medium text-primary-900 hover:bg-primary-900/5"
        >
          <Wand2 className="size-3.5" />
          Generate
        </button>
      </div>
    </label>
  );
}
