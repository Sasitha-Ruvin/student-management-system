"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useSidebarContext } from "@/contexts/sidebar-context";
import { logout } from "@/lib/auth/logout";

export function useLogout() {
  const router = useRouter();
  const { closeMobile } = useSidebarContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const signOut = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const result = await logout();
      if (!result.ok) {
        window.alert(result.error);
        setIsLoggingOut(false);
        return;
      }
      closeMobile();
      router.push("/login");
      router.refresh();
    } catch {
      window.alert("Something went wrong. Please try again.");
      setIsLoggingOut(false);
    }
  }, [closeMobile, isLoggingOut, router]);

  return { signOut, isLoggingOut };
}
