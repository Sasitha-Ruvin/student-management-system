"use client";

import { motion } from "framer-motion";

export type AcademyBrandVariant = "sidebar" | "sidebar-collapsed" | "login";

type AcademyBrandProps = {
  variant: AcademyBrandVariant;
  logoUrl: string | null;
  logoVersion?: string;
};

function AcademyBrandText({
  variant,
}: {
  variant: AcademyBrandVariant;
}) {
  if (variant === "sidebar-collapsed") {
    return <p className="font-headline text-xl text-primary-900">SMS</p>;
  }

  if (variant === "sidebar") {
    return (
      <div className="flex flex-col items-start">
        <p className="font-headline text-[20px] leading-none tracking-tight text-primary-900">
          Student
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.45em] text-neutral-700">
          Management System
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-headline text-3xl tracking-tight text-primary-900 sm:text-4xl">
        Open Source Student Management System
      </h1>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.35em] text-neutral-700">
        Attendance • Enrollment • Admin
      </p>
    </div>
  );
}

const PLACEHOLDER_CLASS: Record<AcademyBrandVariant, string> = {
  "sidebar-collapsed": "flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-900 text-sm font-semibold text-white",
  sidebar: "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-900 text-sm font-semibold text-white",
  login: "flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-900 text-xl font-semibold text-white sm:h-20 sm:w-20",
};

export function AcademyBrand({
  variant,
  logoUrl,
  logoVersion,
}: AcademyBrandProps) {
  void logoUrl;
  void logoVersion;

  return (
    <div
      className={`flex items-center gap-3 ${
        variant === "login" ? "flex-col" : ""
      }`}
    >
      <div className={PLACEHOLDER_CLASS[variant]} aria-hidden="true">
        SMS
      </div>
      <AcademyBrandText variant={variant} />
    </div>
  );
}

type AcademyBrandBlockProps = AcademyBrandProps & {
  className?: string;
};

/** Wrapper with motion layout used in the sidebar. */
export function AcademyBrandBlock({
  variant,
  logoUrl,
  logoVersion,
  className = "",
}: AcademyBrandBlockProps) {
  return (
    <motion.div
      layout
      className={`leading-none ${className}`.trim()}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <AcademyBrand
        variant={variant}
        logoUrl={logoUrl}
        logoVersion={logoVersion}
      />
    </motion.div>
  );
}
