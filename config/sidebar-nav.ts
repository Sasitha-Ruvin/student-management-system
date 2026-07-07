import type { LucideIcon } from "@/lib/icons";
import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Layers,
  Megaphone,
  Settings,
  Users,
} from "@/lib/icons";

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: GraduationCap,
  },
  {
    label: "Students",
    href: "/dashboard/students",
    icon: CalendarCheck,
  },

  {
    label: "Branches",
    href: "/dashboard/branches",
    icon: Megaphone,
  },
  {
    label: "Intakes",
    href: "/dashboard/batches",
    icon: Layers,
  },
  {
    label: "Sessions",
    href: "/dashboard/sessions",
    icon: CalendarDays,
  },
  {
    label: "Payment",
    href: "/dashboard/payments",
    icon: Banknote,
  },
  {
    label: "Alumni",
    href: "/dashboard/alumni",
    icon: Users,
  },
];

export const bottomNavItems: SidebarNavItem[] = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];