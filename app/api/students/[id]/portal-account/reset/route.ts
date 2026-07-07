import { NextResponse } from "next/server";

import { generatePortalPassword } from "@/lib/auth/portal-password";
import { requireAdmin } from "@/lib/api/require-admin";
import { setStudentPortalPassword } from "@/lib/students/set-portal-password";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/students/[id]/portal-account/reset  — Random password + email (legacy)
export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const newPassword = generatePortalPassword();
  const result = await setStudentPortalPassword(id, newPassword, false);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      message: "Portal password reset",
      email: result.email,
      password: result.password,
      emailSent: result.emailSent,
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    },
  });
}
