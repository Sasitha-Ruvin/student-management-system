import { NextResponse } from "next/server";

import { validatePortalPassword } from "@/lib/auth/portal-password";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { emailPortalCredentials } from "@/lib/students/portal-account-email";
import { smsPortalCredentials } from "@/lib/students/portal-account-sms";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStudentByIdOrNull } from "@/lib/students/student-queries";
import type { CreatePortalAccountBody, DisablePortalAccountBody } from "@/types/api/student";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/students/[id]/portal-account  — Create portal account
export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const student = await fetchStudentByIdOrNull(id);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (student.supabaseId !== null) {
    return NextResponse.json(
      { error: "Portal account already exists for this student" },
      { status: 409 },
    );
  }

  let body: CreatePortalAccountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const passwordError = validatePortalPassword(body.temporaryPassword ?? "");
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: student.email,
    password: body.temporaryPassword,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 400 },
    );
  }

  await prisma.student.update({
    where: { id },
    data: {
      supabaseId: authData.user.id,
      isLoginEnabled: true,
    },
  });

  const sendEmail = body.sendEmail !== false;
  const sendSms = body.sendSms === true;

  const settings = sendSms
    ? await prisma.academySettings.findUnique({
        where: { id: "default" },
        select: { contactPhone: true },
      })
    : null;

  const [emailResult, smsResult] = await Promise.all([
    emailPortalCredentials({
      studentEmail: student.email,
      studentName: student.fullName,
      password: body.temporaryPassword,
      isNewAccount: true,
      sendEmail,
    }),
    smsPortalCredentials({
      contactNumber: student.contactNumber,
      whatsappNumber: student.whatsappNumber,
      studentName: student.fullName,
      studentEmail: student.email,
      password: body.temporaryPassword,
      sendSms,
      academyContactPhone: settings?.contactPhone ?? null,
    }),
  ]);

  const { emailSent, emailWarning } = emailResult;
  const { smsSent, smsWarning } = smsResult;

  return NextResponse.json(
    {
      data: {
        email: student.email,
        message: "Portal account created",
        emailSent,
        ...(emailWarning ? { emailWarning } : {}),
        ...(sendSms ? { smsSent, ...(smsWarning ? { smsWarning } : {}) } : {}),
      },
    },
    { status: 201 },
  );
}

// DELETE /api/students/[id]/portal-account  — Disable portal access
export async function DELETE(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const student = await fetchStudentByIdOrNull(id);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  let body: DisablePortalAccountBody = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  await prisma.student.update({
    where: { id },
    data: {
      isLoginEnabled: false,
      loginDisabledNote: body.note?.trim() || null,
    },
  });

  return NextResponse.json({ data: { message: "Portal access disabled" } });
}
