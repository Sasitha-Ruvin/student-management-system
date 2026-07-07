"use client";

import { Banknote, CalendarCheck, LayoutGrid, Users } from "@/lib/icons";

export type BatchDetailTabId = "students" | "sessions" | "attendance" | "finance";

const tabs: {
  id: BatchDetailTabId;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "students", label: "Students", icon: Users },
  { id: "sessions", label: "Sessions", icon: CalendarCheck },
  { id: "attendance", label: "Attendance", icon: LayoutGrid },
  { id: "finance", label: "Finance", icon: Banknote },
];

type BatchDetailTabsProps = {
  activeTab: BatchDetailTabId;
  onTabChange: (tab: BatchDetailTabId) => void;
};

export function BatchDetailTabs({ activeTab, onTabChange }: BatchDetailTabsProps) {
  return (
    <div className="shrink-0 overflow-x-auto overscroll-x-contain pb-1">
      <div className="flex min-w-max gap-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap",
                isActive
                  ? "border-primary-900 bg-primary-900 text-tertiary-100"
                  : "border-secondary-400 bg-tertiary-100 text-neutral-700 hover:bg-secondary-200/60",
              ].join(" ")}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
