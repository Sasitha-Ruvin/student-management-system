"use client";

import { Search } from "@/lib/icons";
import type { SessionTab } from "@/hooks/use-session-filters";

type SessionToolbarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  tab: SessionTab;
  onTabChange: (tab: SessionTab) => void;
  total?: number;
};

export function SessionToolbar({
  search,
  onSearchChange,
  tab,
  onTabChange,
  total,
}: SessionToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-secondary-300/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sessions…"
          className="min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 py-2 pr-3 pl-10 text-sm focus:border-primary-900 focus:outline-none"
        />
      </div>
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-6">
        {total !== undefined ? (
          <p className="text-xs text-neutral-500">
            {total} session{total !== 1 ? "s" : ""}
          </p>
        ) : null}
        <div className="flex gap-6">
        {(["upcoming", "completed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={[
              "pb-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors",
              tab === t
                ? "border-b-2 border-primary-900 text-primary-900"
                : "text-neutral-500 hover:text-primary-900",
            ].join(" ")}
          >
            {t === "upcoming" ? "Upcoming" : "Completed"}
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}

