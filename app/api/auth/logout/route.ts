import { NextResponse } from "next/server";

import { clearCsrfCookie } from "@/lib/csrf/set-response-cookie";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[auth] Logout failed:", error.message);
    return NextResponse.json({ error: "Could not sign out" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  return clearCsrfCookie(response);
}
