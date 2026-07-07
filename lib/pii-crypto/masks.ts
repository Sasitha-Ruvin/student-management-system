/** Redacted placeholder for list/summary API responses. */
export const REDACTED = "••••••••";

/** NIC — no prefix digits (only last char for support reference). */
export function maskNic(nic: string): string {
  const s = nic.trim().toUpperCase();
  if (!s) return REDACTED;
  if (s.length === 1) return "•";
  return `${"•".repeat(Math.max(6, s.length - 1))}${s.slice(-1)}`;
}

/** ISO date (YYYY-MM-DD) — year only. */
export function maskDob(isoDate: string): string {
  const m = isoDate.trim().match(/^(\d{4})/);
  return m ? `${m[1]}-••-••` : REDACTED;
}

/** Address — redacted (no street/postal detail in API JSON). */
export function maskAddress(address: string): string {
  const s = address.trim();
  if (!s) return REDACTED;
  return REDACTED;
}

/** Phone — last 2 digits only. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 2) return REDACTED;
  return `••••${digits.slice(-2)}`;
}

/** Email — first char of local + domain host only. */
export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at === normalized.length - 1) return REDACTED;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const dot = domain.indexOf(".");
  const host = dot === -1 ? domain : domain.slice(0, dot);
  const tld = dot === -1 ? "" : domain.slice(dot);

  const localMask =
    local.length <= 1 ? "•" : `${local[0]}${"•".repeat(Math.min(4, local.length - 1))}`;
  const hostMask =
    host.length <= 1 ? "•" : `${host[0]}${"•".repeat(Math.min(4, host.length - 1))}`;

  return `${localMask}@${hostMask}${tld}`;
}

/** Full name — first letter per word only. */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return REDACTED;
  return parts
    .map((part) =>
      part.length <= 1 ? "•" : `${part[0]}${"•".repeat(Math.min(3, part.length - 1))}`,
    )
    .join(" ");
}
