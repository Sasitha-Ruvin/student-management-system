"use client";

import { settingsTabs, type SettingsTabId } from "@/config/settings-tabs";

type SettingsTabsProps = {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
};

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="shrink-0 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-max gap-2 px-0.5">
        {settingsTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

