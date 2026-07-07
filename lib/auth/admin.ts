import type { Admin } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = Pick<Admin, "id" | "email" | "name" | "supabaseId">;

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      supabaseId: true,
    },
  });

  return admin;
}
