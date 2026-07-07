import { NextResponse, type NextRequest } from "next/server";

import { getClientIp } from "@/lib/rate-limit/client-ip";
import { checkRateLimit } from "@/lib/rate-limit/edge-memory-limiter";

type RateLimitRule = {
  id: string;
  match: (pathname: string, method: string) => boolean;
  limit: number;
  windowMs: number;
};

/** Public / unauthenticated routes that benefit from abuse protection. */
const RULES: RateLimitRule[] = [
  {
    id: "login",
    match: (pathname, method) =>
      pathname === "/api/auth/login" && method === "POST",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
  {
    id: "webhook",
    match: (pathname, method) =>
      pathname.startsWith("/api/webhook/") && method === "POST",
    limit: 60,
    windowMs: 60 * 1000,
  },
];

/**
 * Returns a 429 response when limited, otherwise null (continue middleware).
 */
export function applyRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const method = request.method;

  for (const rule of RULES) {
    if (!rule.match(pathname, method)) continue;

    const ip = getClientIp(request);
    const key = `${rule.id}:${ip}`;
    const result = checkRateLimit(key, rule.limit, rule.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSec),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    break;
  }

  return null;
}
