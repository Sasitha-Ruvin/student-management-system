"use client";

import Link from "next/link";

import {
  CalendarCheck,
  Layers,
  Plus,
  Users,
} from "@/lib/icons";

const actions = [
  {
    key: "register",
    href: "/dashboard/students/new",
    label: "Register student",
    description: "Add someone new",
    icon: Plus,
  },
  {
    key: "batch",
    href: "/dashboard/batches",
    label: "New class",
    description: "Start an intake",
    icon: Layers,
  },
  {
    key: "sessions",
    href: "/dashboard/sessions",
    label: "Sessions",
    description: "View the schedule",
    icon: CalendarCheck,
  },
  {
    key: "students",
    href: "/dashboard/students",
    label: "All students",
    description: "Search and manage",
    icon: Users,
  },
] as const;

export function DashboardQuickActions() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-neutral-700">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map(({ key, href, label, description, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className="flex min-h-[4.5rem] items-center gap-4 rounded-2xl border border-secondary-300/50 bg-white p-4 shadow-sm transition-colors hover:border-secondary-300 hover:bg-tertiary-100/60"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-900">
              <Icon className="size-5 text-tertiary-100" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-medium text-primary-900">{label}</p>
              <p className="text-sm text-neutral-600">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
