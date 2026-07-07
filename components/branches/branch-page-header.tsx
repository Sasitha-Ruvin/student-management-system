"use client";

import { motion } from "framer-motion";

import { Building2, Plus } from "@/lib/icons";

type BranchPageHeaderProps = {
  activeCount: number;
  studentCount: number;
  onAdd: () => void;
};

export function BranchPageHeader({
  activeCount,
  studentCount,
  onAdd,
}: BranchPageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary-300/80">
          <Building2 className="size-5 text-primary-900" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-primary-900 md:text-3xl">
            Branch Management
          </h1>
          <p className="mt-0.5 text-sm text-neutral-700">
            {activeCount} active location{activeCount !== 1 ? "s" : ""} ·{" "}
            {studentCount} student{studentCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-medium text-tertiary-100 transition-opacity hover:opacity-90 active:opacity-80 sm:w-auto sm:py-2.5"
      >
        <Plus className="size-4" />
        Add Branch
      </button>
    </motion.header>
  );
}
