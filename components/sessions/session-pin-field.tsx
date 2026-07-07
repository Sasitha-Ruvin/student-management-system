"use client";

import { useEffect, useRef } from "react";

import { generateSessionPin } from "@/lib/sessions/generate-session-pin";

const inputClass =
  "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm font-mono tracking-widest focus:border-primary-900 focus:outline-none";

type SessionPinFieldProps = {
  value: string;
  onChange: (pin: string) => void;
  /** Generate a PIN once when mounted with an empty value */
  autoGenerateOnMount?: boolean;
};

export function SessionPinField({
  value,
  onChange,
  autoGenerateOnMount = false,
}: SessionPinFieldProps) {
  const didAutoGenerate = useRef(false);

  useEffect(() => {
    if (!autoGenerateOnMount || didAutoGenerate.current) return;
    didAutoGenerate.current = true;
    if (!value) {
      onChange(generateSessionPin());
    }
  }, [autoGenerateOnMount, onChange, value]);

  function handleGenerate() {
    onChange(generateSessionPin());
  }

  const showDisplay = value.length === 4;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
          4-digit PIN
        </span>
        <button
          type="button"
          onClick={handleGenerate}
          className="min-h-9 rounded-lg border border-primary-900/30 bg-primary-900/5 px-3 text-xs font-medium text-primary-900 hover:bg-primary-900/10"
        >
          {value ? "Generate new PIN" : "Generate PIN"}
        </button>
      </div>

      {showDisplay ? (
        <div
          className="rounded-xl border border-secondary-300/60 bg-secondary-100/50 px-4 py-5 text-center"
          aria-live="polite"
        >
          <p className="text-[10px] font-semibold tracking-wide text-neutral-600 uppercase">
            Attendance PIN
          </p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-[0.35em] text-primary-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            Share with students for portal check-in
          </p>
        </div>
      ) : null}

      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
        placeholder="Or type 4 digits"
        className={inputClass}
        aria-label="4-digit attendance PIN"
      />
    </div>
  );
}
