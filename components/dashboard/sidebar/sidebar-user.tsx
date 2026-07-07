"use client";

import { Spinner } from "@/components/ui/spinner";
import { useLogout } from "@/hooks/use-logout";
import type { AdminSession } from "@/lib/auth/admin";
import { LogOut } from "@/lib/icons";

type SidebarUserProps = {
  admin: AdminSession;
  collapsed: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SidebarUser({ admin, collapsed }: SidebarUserProps) {
  const { signOut, isLoggingOut } = useLogout();
  const initials = getInitials(admin.name);

  return (
    <div className="mx-3 mb-2 space-y-2">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-secondary-400">
          <div className="flex size-full items-center justify-center text-xs font-semibold text-primary-900">
            {initials}
          </div>
        </div>

        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary-900">
              {admin.name}
            </p>
            <p className="truncate text-xs text-neutral-600">Global Director</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={isLoggingOut}
          title="Log out"
          aria-label="Log out"
          className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg border border-secondary-300/60 text-neutral-600 hover:bg-secondary-200/80 disabled:opacity-60"
        >
          {isLoggingOut ? (
            <Spinner className="size-4" label="Signing out" />
          ) : (
            <LogOut className="size-4" aria-hidden />
          )}
        </button>
      </div>

    </div>
  );
}
