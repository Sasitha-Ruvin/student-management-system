import { NextResponse } from "next/server";

import { clearCsrfCookieOptions, csrfCookieOptions } from "@/lib/csrf/cookie-options";

export function attachCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(csrfCookieOptions(token));
  return response;
}

export function clearCsrfCookie(response: NextResponse): NextResponse {
  response.cookies.set(clearCsrfCookieOptions());
  return response;
}
