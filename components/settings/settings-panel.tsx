"use client";

import { AnimatePresence, motion } from "framer-motion";

type SettingsPanelProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsPanel({ title, children }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25 }}
      className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-6 shadow-sm"
    >
      <h2 className="mb-6 font-headline text-xl text-primary-900">{title}</h2>
      {children}
    </motion.div>
  );
}

type SettingsPanelWrapperProps = {
  panelKey: string;
  title: string;
  children: React.ReactNode;
};

export function SettingsPanelWrapper({
  panelKey,
  title,
  children,
}: SettingsPanelWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <SettingsPanel key={panelKey} title={title}>
        {children}
      </SettingsPanel>
    </AnimatePresence>
  );
}
