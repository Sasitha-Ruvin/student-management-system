import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAdminSession } from "@/lib/auth/admin";
import { getAcademyBranding } from "@/lib/settings/academy-branding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminSession();

  if (!admin) {
    redirect("/login");
  }

  const branding = await getAcademyBranding();

  return <DashboardShell admin={admin} branding={branding}>{children}</DashboardShell>;
}
