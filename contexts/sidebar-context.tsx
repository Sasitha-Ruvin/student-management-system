"use client";

import { createContext, useContext } from "react";

import type { useSidebar } from "@/hooks/use-sidebar";

export type SidebarContextValue = ReturnType<typeof useSidebar>;

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  value,
  children,
}: {
  value: SidebarContextValue;
  children: React.ReactNode;
}) {
  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return ctx;
}
