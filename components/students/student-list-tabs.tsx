"use client";

import { Layers, UserPlus, Users } from "@/lib/icons";
import type { StudentListTab } from "@/hooks/use-student-filters";

const tabs: {
  id: StudentListTab;
  label: string;
  icon: typeof Users;
  description: string;
}[] = [
  {
    id: "enrolled",
    label: "Enrolled",
    icon: Users,
    description: "Students assigned to a batch",
  },
  {
    id: "pending",
    label: "Pending assignment",
    icon: UserPlus,
    description: "Awaiting batch assignment",
  },
  {
    id: "all",
    label: "All students",
    icon: Layers,
    description: "Every student record",
  },
];

type StudentListTabsProps = {
  activeTab: StudentListTab;
  onTabChange: (tab: StudentListTab) => void;
  pendingCount?: number | null;
};

export function StudentListTabs({
  activeTab,
  onTabChange,
  pendingCount,
}: StudentListTabsProps) {
  return (
    <div className="shrink-0 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max gap-2 px-0.5">
        {tabs.map(({ id, label, icon: Icon, description }) => {
          const isActive = activeTab === id;
          const showPendingBadge =
            id === "pending" && pendingCount != null && pendingCount > 0;

          return (
            <button
              key={id}
              type="button"
              title={description}
              onClick={() => onTabChange(id)}
              className={[
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors active:scale-[0.98]",
                isActive
                  ? "border-primary-900 bg-primary-900 text-tertiary-100"
                  : "border-secondary-400 bg-tertiary-100 text-neutral-700 hover:bg-secondary-200/60",
              ].join(" ")}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {showPendingBadge ? (
                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                    isActive
                      ? "bg-tertiary-100 text-primary-900"
                      : "bg-amber-100 text-amber-900",
                  ].join(" ")}
                >
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
