import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login/login-screen";
import { getAdminSession } from "@/lib/auth/admin";
import { getAcademyBranding } from "@/lib/settings/academy-branding";

export default async function LoginPage() {
  const admin = await getAdminSession();

  if (admin) {
    redirect("/dashboard");
  }

  const branding = await getAcademyBranding();

  return <LoginScreen branding={branding} />;
}
