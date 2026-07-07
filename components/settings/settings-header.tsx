"use client";

import { motion } from "framer-motion";

import { Settings } from "@/lib/icons";

export function SettingsHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="shrink-0"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-900">
          <Settings className="size-5 text-tertiary-100" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-primary-900 md:text-3xl">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-neutral-700">
            Manage academy configuration and preferences
          </p>
        </div>
      </div>
    </motion.header>
  );
}
