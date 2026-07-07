import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin";

export async function GET() {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  });
}
