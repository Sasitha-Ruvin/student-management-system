"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSidebarContext } from "@/contexts/sidebar-context";
import type { SidebarNavItem } from "@/config/sidebar-nav";

type SidebarNavItemLinkProps = {
  item: SidebarNavItem;
  collapsed: boolean;
};

export function SidebarNavItemLink({ item, collapsed }: SidebarNavItemLinkProps) {
  const pathname = usePathname();
  const { isMobile, closeMobile } = useSidebarContext();
  const Icon = item.icon;

  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={() => {
        if (isMobile) closeMobile();
      }}
      className={[
        "group relative mx-3 flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-secondary-300/60",
        isActive
          ? "bg-secondary-300 text-primary-900"
          : "text-neutral-800 hover:bg-secondary-200/80",
        collapsed ? "justify-center px-0" : "",
      ].join(" ")}
    >
      {isActive ? (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary-900" />
      ) : null}

      <Icon
        className="size-[18px] shrink-0 stroke-[1.5]"
        aria-hidden
      />

      {!collapsed ? (
        <span className="text-[15px] font-medium leading-none">{item.label}</span>
      ) : null}
    </Link>
  );
}