import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  requiresCsrfValidation,
  validateCsrfRequest,
} from "@/lib/csrf/validate-request";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { applyRateLimit } from "@/lib/rate-limit/apply-rate-limit";
import { withSecurityHeaders } from "@/lib/security/apply-security-headers";
import { isPublicApiPath } from "@/lib/security/public-api-paths";
import { supabaseAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";

export async function middleware(request: NextRequest) {
  const rateLimited = applyRateLimit(request);
  if (rateLimited) return withSecurityHeaders(rateLimited, request);

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return withSecurityHeaders(NextResponse.next({ request }), request);
  }

  if (requiresCsrfValidation(request.method, pathname)) {
    if (!validateCsrfRequest(request)) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 }),
        request,
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/api/") && !isPublicApiPath(pathname) && !user) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  if (user) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-supabase-user-id", user.id);
    const nextResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    for (const cookie of supabaseResponse.cookies.getAll()) {
      nextResponse.cookies.set(cookie);
    }
    return withSecurityHeaders(nextResponse, request);
  }

  return withSecurityHeaders(supabaseResponse, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
