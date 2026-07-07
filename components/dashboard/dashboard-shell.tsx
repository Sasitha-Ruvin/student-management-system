"use client";

import { CsrfBootstrap } from "@/components/auth/csrf-bootstrap";
import type { AdminSession } from "@/lib/auth/admin";
import type { AcademyBranding } from "@/lib/settings/academy-branding";
import { BranchesPickerProvider } from "@/contexts/branches-picker-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useSidebar } from "@/hooks/use-sidebar";

import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar/Sidebar";

type DashboardShellProps = {
  admin: AdminSession;
  branding: AcademyBranding;
  children: React.ReactNode;
};

export function DashboardShell({ admin, branding, children }: DashboardShellProps) {
  const sidebar = useSidebar();

  return (
      <BranchesPickerProvider>
      <SidebarProvider value={sidebar}>
        <CsrfBootstrap />
        <div className="flex h-[100dvh] overflow-hidden bg-background">
          {sidebar.isMobile && sidebar.isMobileOpen ? (
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-30 bg-primary-900/40 lg:hidden"
              onClick={sidebar.closeMobile}
            />
          ) : null}

          <Sidebar admin={admin} branding={branding} />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {sidebar.isMobile ? (
              <MobileHeader onMenuClick={sidebar.toggleMobile} />
            ) : null}
            <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-20 sm:p-6 sm:pb-8 md:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      </BranchesPickerProvider>
  );
}
