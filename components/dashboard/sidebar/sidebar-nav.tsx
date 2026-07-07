"use client";

import {
  bottomNavItems,
  mainNavItems,
  type SidebarNavItem,
} from "@/config/sidebar-nav";

import { SidebarNavItemLink } from "./sidebar-nav-item";

type SidebarNavProps = {
  collapsed: boolean;
  items: SidebarNavItem[];
};

function NavGroup({ collapsed, items }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <SidebarNavItemLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </nav>
  );
}

export function SidebarMainNav({ collapsed }: { collapsed: boolean }) {
  return <NavGroup collapsed={collapsed} items={mainNavItems} />;
}

export function SidebarBottomNav({ collapsed }: { collapsed: boolean }) {
  return <NavGroup collapsed={collapsed} items={bottomNavItems} />;
}