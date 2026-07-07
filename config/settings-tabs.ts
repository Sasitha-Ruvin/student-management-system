import type { LucideIcon } from "@/lib/icons";
import {
  Bell,
  Building2,
  Layers,
  CreditCard,
  FileText,
  Image,
  Settings,
  Shield,
} from "@/lib/icons";

export type SettingsTabId =
  | "academy"
  | "invoice"
  | "branding"
  | "notifications"
  | "payment"
  | "registration"
  | "profile";

export type SettingsTabConfig = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
};

export const settingsTabs: SettingsTabConfig[] = [
  { id: "academy", label: "Academy", icon: Building2 },
  { id: "invoice", label: "Invoice", icon: FileText },
  { id: "branding", label: "Branding", icon: Image },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payment", label: "Payment Structure", icon: CreditCard },
  { id: "registration", label: "Registration", icon: Layers },
  { id: "profile", label: "Profile", icon: Shield },
];
