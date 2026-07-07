const META_REGEX = /^\[walk-meta\]([\s\S]*?)\[\/walk-meta\]\n?/;

export type SessionScheduleMeta = {
  scheduledEndAt: Date | null;
  displayNotes: string | null;
};

/** Reads optional end time embedded in session notes (no extra DB column). */
export function parseSessionScheduleMeta(
  notes: string | null | undefined,
): SessionScheduleMeta {
  if (!notes?.trim()) {
    return { scheduledEndAt: null, displayNotes: null };
  }

  const match = notes.match(META_REGEX);
  if (!match) {
    return { scheduledEndAt: null, displayNotes: notes.trim() };
  }

  let scheduledEndAt: Date | null = null;
  try {
    const payload = JSON.parse(match[1]) as { endsAt?: string };
    if (payload.endsAt) {
      const parsed = new Date(payload.endsAt);
      if (!isNaN(parsed.getTime())) scheduledEndAt = parsed;
    }
  } catch {
    // ignore corrupt meta
  }

  const displayNotes = notes.slice(match[0].length).trim() || null;
  return { scheduledEndAt, displayNotes };
}

export function mergeSessionScheduleMeta(
  displayNotes: string | null | undefined,
  scheduledEndAt: Date | null | undefined,
): string | null {
  const text = displayNotes?.trim() ?? "";
  const endIso =
    scheduledEndAt && !isNaN(scheduledEndAt.getTime())
      ? scheduledEndAt.toISOString()
      : null;

  if (!endIso && !text) return null;
  if (!endIso) return text;

  const meta = `[walk-meta]${JSON.stringify({ endsAt: endIso })}[/walk-meta]`;
  return text ? `${meta}\n${text}` : meta;
}

export function validateSessionEndTime(
  scheduledAt: Date,
  scheduledEndAt: Date | null | undefined,
): string | null {
  if (!scheduledEndAt) return null;
  if (isNaN(scheduledEndAt.getTime())) return "Invalid end time";
  if (scheduledEndAt.getTime() <= scheduledAt.getTime()) {
    return "End time must be after start time";
  }
  return null;
}

export function splitStoredSessionNotes(notes: string | null | undefined): {
  scheduledEndAt: string | null;
  notes: string | null;
} {
  const parsed = parseSessionScheduleMeta(notes);
  return {
    scheduledEndAt: parsed.scheduledEndAt?.toISOString() ?? null,
    notes: parsed.displayNotes,
  };
}
