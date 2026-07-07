import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { attachCsrfCookie, clearCsrfCookie } from "@/lib/csrf/set-response-cookie";
import { createCsrfToken } from "@/lib/csrf/token";
import { createClient } from "@/lib/supabase/server";

const INVALID_CREDENTIALS = "Invalid email or password";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    if (error) {
      console.warn("[auth] Login failed:", error.message);
    }
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { supabaseId: data.user.id },
    select: { id: true, email: true, name: true },
  });

  if (!admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const csrfToken = createCsrfToken();
  const response = NextResponse.json({ admin, csrfToken });
  return attachCsrfCookie(response, csrfToken);
}
