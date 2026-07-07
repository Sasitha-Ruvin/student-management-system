"use client";

import Link from "next/link";

import { BranchFilterChip } from "@/components/ui/branch-filter-chip";
import type { StudentListTab } from "@/hooks/use-student-filters";
import { Plus, Users } from "@/lib/icons";

const TAB_SUBTITLES: Record<StudentListTab, string> = {
  enrolled: "assigned to a batch",
  pending: "awaiting batch assignment",
  all: "in the system",
};

type StudentPageHeaderProps = {
  totalCount: number;
  listTab?: StudentListTab;
};

export function StudentPageHeader({
  totalCount,
  listTab = "enrolled",
}: StudentPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary-300/80">
          <Users className="size-5 text-primary-900" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-primary-900 md:text-3xl">
            Student Management
          </h1>
          <p className="mt-0.5 text-sm text-neutral-700">
            {totalCount} student{totalCount !== 1 ? "s" : ""} {TAB_SUBTITLES[listTab]}
          </p>
          <BranchFilterChip className="mt-2" />
        </div>
      </div>
      <Link
        href="/dashboard/students/new"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-900 px-5 py-3 text-sm font-medium text-tertiary-100 transition-opacity hover:opacity-90 sm:w-auto sm:py-2.5"
      >
        <Plus className="size-4" />
        Register Student
      </Link>
    </header>
  );
}
