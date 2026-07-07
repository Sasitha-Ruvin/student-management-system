import { NextResponse, type NextRequest } from "next/server";

import { X_ROBOTS_TAG } from "@/lib/security/constants";

export { X_ROBOTS_TAG };

const API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

/** Merge crawl-blocking and API cache headers onto a middleware response. */
export function applySecurityHeaders(
  response: NextResponse,
  pathname: string,
): NextResponse {
  response.headers.set("X-Robots-Tag", X_ROBOTS_TAG);

  if (pathname.startsWith("/api/")) {
    for (const [key, value] of Object.entries(API_CACHE_HEADERS)) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export function withSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  return applySecurityHeaders(response, request.nextUrl.pathname);
}
