import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { CSRF_COOKIE } from "@/lib/csrf/constants";

export function csrfCookieOptions(token: string): ResponseCookie {
  return {
    name: CSRF_COOKIE,
    value: token,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    maxAge: 60 * 60 * 24,
  };
}

export function clearCsrfCookieOptions(): ResponseCookie {
  return {
    name: CSRF_COOKIE,
    value: "",
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    maxAge: 0,
  };
}
