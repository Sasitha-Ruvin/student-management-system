import type { NextRequest } from "next/server";

import {
  CSRF_COOKIE,
  CSRF_EXEMPT_EXACT,
  CSRF_EXEMPT_PREFIXES,
  CSRF_HEADER,
} from "@/lib/csrf/constants";
import { csrfTokensMatch } from "@/lib/csrf/token";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_EXACT.includes(pathname as (typeof CSRF_EXEMPT_EXACT)[number])) {
    return true;
  }
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function requiresCsrfValidation(method: string, pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (!MUTATING_METHODS.has(method)) return false;
  return !isCsrfExempt(pathname);
}

export function validateCsrfRequest(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value ?? "";
  const headerToken = request.headers.get(CSRF_HEADER) ?? "";
  if (!cookieToken || !headerToken) return false;
  return csrfTokensMatch(cookieToken, headerToken);
}
