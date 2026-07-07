"use client";

import { motion } from "framer-motion";

import { Building2, Layers, Users } from "@/lib/icons";

type BranchStats = {
  activeBranchCount: number;
  totalStudents: number;
  activeBatchCount: number;
};

type BranchStatsRowProps = {
  stats: BranchStats;
};

const statItems = [
  {
    key: "branches",
    label: "Active Branches",
    icon: Building2,
    getValue: (s: BranchStats) => s.activeBranchCount,
  },
  {
    key: "students",
    label: "Total Students",
    icon: Users,
    getValue: (s: BranchStats) => s.totalStudents,
  },
  {
    key: "batches",
    label: "Active Batches",
    icon: Layers,
    getValue: (s: BranchStats) => s.activeBatchCount,
  },
] as const;

export function BranchStatsRow({ stats }: BranchStatsRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {statItems.map(({ key, label, icon: Icon, getValue }) => (
        <div
          key={key}
          className="flex items-center gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary-200/80">
            <Icon className="size-5 text-primary-900" />
          </div>
          <div>
            <p className="font-headline text-2xl text-primary-900 sm:text-3xl">
              {getValue(stats)}
            </p>
            <p className="text-[11px] tracking-wide text-neutral-600 uppercase">
              {label}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
