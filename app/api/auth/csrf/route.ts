import { NextResponse } from "next/server";

import { getRequestAdmin } from "@/lib/api/request-admin";
import { attachCsrfCookie } from "@/lib/csrf/set-response-cookie";
import { createCsrfToken } from "@/lib/csrf/token";

/**
 * GET /api/auth/csrf
 * Issues a fresh CSRF token for the current admin session (page refresh / long sessions).
 */
export async function GET() {
  const admin = await getRequestAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrfToken = createCsrfToken();
  const response = NextResponse.json({ data: { csrfToken } });
  return attachCsrfCookie(response, csrfToken);
}
