import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { setStudentPortalPassword } from "@/lib/students/set-portal-password";
import type { SetPortalPasswordBody } from "@/types/api/student";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/students/[id]/portal-account/password  — Set a new portal password
export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: SetPortalPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await setStudentPortalPassword(
    id,
    body.newPassword ?? "",
    body.sendEmail === true,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    data: {
      email: result.email,
      password: result.password,
      message: "Portal password updated",
      emailSent: result.emailSent,
      ...(result.emailWarning ? { emailWarning: result.emailWarning } : {}),
    },
  });
}
