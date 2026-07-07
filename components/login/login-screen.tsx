"use client";

import { motion } from "framer-motion";

import { easeOut } from "@/components/login/animations";
import { LoginForm } from "@/components/login/login-form";
import { LoginHero } from "@/components/login/login-hero";
import { AcademyBrand } from "@/components/branding/academy-brand";
import { APP_VERSION, COMPANY_NAME } from "@/lib/app-meta";
import type { AcademyBranding } from "@/lib/settings/academy-branding";

type LoginScreenProps = {
  branding: AcademyBranding;
};

export function LoginScreen({ branding }: LoginScreenProps) {
  const currentYear = new Date().getFullYear();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <LoginHero />

      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F2ED] px-4 py-10 sm:px-6 sm:py-12">
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
        >
          <AcademyBrand
            variant="login"
            logoUrl={branding.logoUrl}
            logoVersion={branding.updatedAt}
          />
        </motion.div>

        <motion.div
          className="w-full max-w-[420px] rounded-[28px] bg-white px-6 py-8 shadow-[0_8px_40px_rgba(0,0,0,0.06)] sm:px-10 sm:py-12"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.2, ease: easeOut }}
        >
          <LoginForm />

          <motion.p
            className="mt-10 text-center text-[10px] uppercase tracking-[0.12em] text-neutral-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            {COMPANY_NAME} · v{APP_VERSION} · © {currentYear}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
