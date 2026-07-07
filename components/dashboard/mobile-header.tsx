"use client";

import { Menu } from "@/lib/icons";

type MobileHeaderProps = {
  onMenuClick: () => void;
};

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-secondary-300/60 bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-900 transition-colors hover:bg-secondary-200/80 active:bg-secondary-300/80"
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>
      <p className="font-headline text-lg text-primary-900">Walk Model Agency</p>
    </header>
  );
}
