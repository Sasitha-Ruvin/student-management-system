export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "X-CSRF-Token";

export const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/login",
  "/api/webhook/",
] as const;

export const CSRF_EXEMPT_EXACT = ["/api/branding/logo"] as const;
