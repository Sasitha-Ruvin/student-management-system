const PUBLIC_API_EXACT = [
  "/api/auth/login",
  "/api/auth/csrf",
  "/api/branding/logo",
  "/api/invoices/download",
] as const;

const PUBLIC_API_PREFIXES = ["/api/webhook/"] as const;

/** Routes that may be called without an authenticated admin session. */
export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT.includes(pathname as (typeof PUBLIC_API_EXACT)[number])) {
    return true;
  }
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
