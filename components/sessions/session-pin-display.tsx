"use client";

import { useState } from "react";

const WINDOW_BEFORE_MS = 60 * 60 * 1000;
const WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

type SessionPinDisplayProps = {
  pin: string;
  scheduledAt: string;
  status: string;
};

function isWithinAttendanceWindow(scheduledAt: string): boolean {
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  return (
    now >= start - WINDOW_BEFORE_MS && now <= start + WINDOW_AFTER_MS
  );
}

export function SessionPinDisplay({
  pin,
  scheduledAt,
  status,
}: SessionPinDisplayProps) {
  const [copied, setCopied] = useState(false);

  if (status !== "SCHEDULED" || !isWithinAttendanceWindow(scheduledAt)) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-primary-900/20 bg-primary-900/5 px-6 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">
        Attendance PIN — share with students
      </p>
      <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-primary-900">
        {pin}
      </p>
      <p className="mt-2 text-sm text-neutral-600">
        Students enter this PIN in the student portal to mark attendance.
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="mt-3 min-h-10 rounded-xl border border-secondary-400 bg-tertiary-100 px-4 py-2 text-sm font-medium text-primary-900 hover:bg-secondary-100"
      >
        {copied ? "Copied!" : "Copy PIN"}
      </button>
    </div>
  );
}
