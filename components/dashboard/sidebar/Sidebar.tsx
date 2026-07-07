"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useSidebarContext } from "@/contexts/sidebar-context";
import type { AdminSession } from "@/lib/auth/admin";
import type { AcademyBranding } from "@/lib/settings/academy-branding";

import { SidebarBranchFilter } from "./sidebar-branch-filter";
import { SidebarBottomNav, SidebarMainNav } from "./sidebar-nav";
import { SidebarLogo } from "./sidebar-logo";
import { SidebarToggle } from "./sidebar-toggle";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarUser } from "./sidebar-user";

type SidebarProps = {
  admin: AdminSession;
  branding: AcademyBranding;
};

function SidebarContent({
  admin,
  branding,
  collapsed,
}: {
  admin: AdminSession;
  branding: AcademyBranding;
  collapsed: boolean;
}) {
  return (
    <>
      <SidebarLogo collapsed={collapsed} branding={branding} />
      <SidebarBranchFilter collapsed={collapsed} />

      <div className="flex flex-1 flex-col overflow-y-auto overscroll-y-contain">
        <SidebarMainNav collapsed={collapsed} />
      </div>

      <div className="mt-auto space-y-2 pb-2">
        <SidebarBottomNav collapsed={collapsed} />
        <SidebarUser admin={admin} collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </div>
    </>
  );
}

export function Sidebar({ admin, branding }: SidebarProps) {
  const {
    isCollapsed,
    isReady,
    isMobile,
    isMobileOpen,
    toggle,
    closeMobile,
    width,
  } = useSidebarContext();

  if (isMobile) {
    return (
      <AnimatePresence>
        {isMobileOpen ? (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-40 flex w-[min(280px,85vw)] flex-col border-r border-secondary-300/60 bg-[#F9F9F9] shadow-xl"
          >
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close menu"
                className="flex size-11 items-center justify-center rounded-xl text-neutral-700 hover:bg-secondary-200/80 active:bg-secondary-300/80"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
              <SidebarContent admin={admin} branding={branding} collapsed={false} />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative hidden h-full shrink-0 flex-col border-r border-secondary-300/60 bg-[#F9F9F9] lg:flex",
        !isReady ? "w-[280px]" : "",
      ].join(" ")}
    >
      <SidebarToggle collapsed={isCollapsed} onToggle={toggle} />
      <SidebarContent admin={admin} branding={branding} collapsed={isCollapsed} />
    </motion.aside>
  );
}
