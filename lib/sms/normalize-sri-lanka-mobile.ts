/**
 * Normalizes Sri Lankan mobile numbers to Text.lk format: 94XXXXXXXXX (no +).
 * Returns null if invalid.
 */
export function normalizeSriLankaMobile(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let cleaned = raw.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = `94${cleaned.slice(1)}`;
  } else if (!cleaned.startsWith("94")) {
    cleaned = `94${cleaned}`;
  }

  if (!/^94[1-9][0-9]{8}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}
