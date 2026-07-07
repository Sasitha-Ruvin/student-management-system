import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth/admin";

export default async function Home() {
  const admin = await getAdminSession();

  if (admin) {
    redirect("/dashboard");
  }

  redirect("/login");
}