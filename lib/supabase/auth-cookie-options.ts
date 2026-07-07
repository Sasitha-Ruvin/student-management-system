import type { CookieOptions } from "@supabase/ssr";

/**
 * Defaults for Supabase auth cookies (sb-*-auth-token).
 * Secure is off in development so http://localhost still receives cookies.
 */
export const supabaseAuthCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};
