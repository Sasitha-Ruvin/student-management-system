"use client";

import Link from "next/link";
import { CalendarCheck, Globe, Layers, UserPlus, Users } from "@/lib/icons";
import type { DashboardStats } from "@/types/api/dashboard";

type DashboardKpiRowProps = {
  stats: DashboardStats;
};

const kpis = [
  {
    key: "students",
    label: "Students",
    icon: Users,
    getValue: (s: DashboardStats) => s.totalStudents,
    href: undefined,
  },
  {
    key: "classes",
    label: "Running classes",
    icon: Layers,
    getValue: (s: DashboardStats) => s.activeBatches,
    href: undefined,
  },
  {
    key: "sessions",
    label: "Sessions this week",
    icon: CalendarCheck,
    getValue: (s: DashboardStats) => s.sessionsThisWeek,
    href: undefined,
  },
  {
    key: "website",
    label: "Website applications",
    icon: Globe,
    getValue: (s: DashboardStats) => s.websitePendingApplications,
    href: "/dashboard/students?tab=pending&source=WEBSITE",
  },
  {
    key: "unassigned",
    label: "Need a class",
    icon: UserPlus,
    getValue: (s: DashboardStats) => s.unassignedStudents,
    href: "/dashboard/students?tab=pending",
  },
] as const;

export function DashboardKpiRow({ stats }: DashboardKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpis.map(({ key, label, icon: Icon, getValue, href }) => {
        const value = getValue(stats);
        const content = (
          <>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary-200/80">
              <Icon className="size-5 text-primary-900" />
            </div>
            <div className="min-w-0">
              <p className="font-headline text-2xl text-primary-900 sm:text-3xl">
                {value}
              </p>
              <p className="text-[11px] leading-snug tracking-wide text-neutral-600 uppercase">
                {label}
              </p>
            </div>
          </>
        );

        if (href && value > 0) {
          return (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm transition hover:border-primary-900/30 sm:gap-4"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={key}
            className="flex items-center gap-3 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm sm:gap-4"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
