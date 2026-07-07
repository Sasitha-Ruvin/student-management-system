"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";

const STORAGE_KEY = "admin-sidebar-collapsed";
const DESKTOP_EXPANDED_WIDTH = 280;
const DESKTOP_COLLAPSED_WIDTH = 72;

export function useSidebar() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === "true");
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileOpen]);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile = useCallback(
    () => setIsMobileOpen((prev) => !prev),
    [],
  );

  const width = isMobile
    ? DESKTOP_EXPANDED_WIDTH
    : isCollapsed
      ? DESKTOP_COLLAPSED_WIDTH
      : DESKTOP_EXPANDED_WIDTH;

  return {
    isCollapsed: isMobile ? false : isCollapsed,
    isReady,
    isMobile,
    isMobileOpen,
    toggle,
    collapse,
    expand,
    openMobile,
    closeMobile,
    toggleMobile,
    width,
  };
}
