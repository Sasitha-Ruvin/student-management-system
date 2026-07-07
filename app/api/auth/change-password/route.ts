import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ChangePasswordBody } from "@/types/api/settings";

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  let body: ChangePasswordBody;
  try {
    body = (await request.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "currentPassword and newPassword are required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from current password" },
      { status: 400 },
    );
  }

  const adminRecord = await prisma.admin.findUnique({
    where: { id: admin.id },
    select: { email: true },
  });

  if (!adminRecord) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: adminRecord.email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: { success: true } });
}
