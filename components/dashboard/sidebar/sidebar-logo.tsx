"use client";

import { AcademyBrandBlock } from "@/components/branding/academy-brand";
import type { AcademyBranding } from "@/lib/settings/academy-branding";

type SidebarLogoProps = {
  collapsed: boolean;
  branding: AcademyBranding;
};

export function SidebarLogo({ collapsed, branding }: SidebarLogoProps) {
  return (
    <div
      className={`flex w-full flex-col items-center px-3 ${
        collapsed ? "py-2" : "pt-3 pb-0"
      }`}
    >
      <AcademyBrandBlock
        variant={collapsed ? "sidebar-collapsed" : "sidebar"}
        logoUrl={branding.logoUrl}
        logoVersion={branding.updatedAt}
      />
    </div>
  );
}
