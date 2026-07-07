"use client";

import { PanelLeftClose, PanelLeftOpen } from "@/lib/icons";

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="absolute -right-3 top-20 z-10 hidden size-8 items-center justify-center rounded-full border border-secondary-400 bg-tertiary-100 text-neutral-700 shadow-sm transition hover:bg-white lg:flex"
    >
      {collapsed ? (
        <PanelLeftOpen className="size-3.5" strokeWidth={2} />
      ) : (
        <PanelLeftClose className="size-3.5" strokeWidth={2} />
      )}
    </button>
  );
}