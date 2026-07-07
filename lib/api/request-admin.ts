import { cache } from "react";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { Admin } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type RequestAdmin = Pick<Admin, "id" | "email" | "name">;

const adminSelect = { id: true, email: true, name: true } as const;

/** Dedupes Supabase + Prisma admin lookup within a single request. */
export const getRequestAdmin = cache(async (): Promise<RequestAdmin | null> => {
  const headerStore = await headers();
  const supabaseUserId = headerStore.get("x-supabase-user-id");

  if (supabaseUserId) {
    return prisma.admin.findUnique({
      where: { supabaseId: supabaseUserId },
      select: adminSelect,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return prisma.admin.findUnique({
    where: { supabaseId: user.id },
    select: adminSelect,
  });
});

export type RequireAdminResult =
  | { admin: RequestAdmin; error: null }
  | { admin: null; error: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const admin = await getRequestAdmin();

  if (!admin) {
    return {
      admin: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { admin, error: null };
}
