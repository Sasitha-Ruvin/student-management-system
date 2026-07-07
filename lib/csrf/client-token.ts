import { CSRF_COOKIE } from "@/lib/csrf/constants";

const CSRF_MAX_AGE_SECONDS = 60 * 60 * 24;

let inMemoryToken: string | null = null;

/** Read CSRF token from the non-httpOnly cookie (browser only). */
export function readCsrfTokenFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Persist token for header + cookie so middleware double-submit check passes. */
export function setClientCsrfToken(token: string | null): void {
  inMemoryToken = token;

  if (typeof document === "undefined") return;

  if (!token) {
    document.cookie = `${CSRF_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
    return;
  }

  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const encoded = encodeURIComponent(token);
  document.cookie = [
    `${CSRF_COOKIE}=${encoded}`,
    "path=/",
    `max-age=${CSRF_MAX_AGE_SECONDS}`,
    "SameSite=Strict",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function getClientCsrfToken(): string | null {
  return inMemoryToken ?? readCsrfTokenFromDocument();
}

export function clearClientCsrfToken(): void {
  setClientCsrfToken(null);
}
