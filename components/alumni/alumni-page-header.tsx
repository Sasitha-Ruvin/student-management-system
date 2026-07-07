import { BranchFilterChip } from "@/components/ui/branch-filter-chip";

export function AlumniPageHeader() {
  return (
    <header className="space-y-2">
      <h1 className="font-headline text-2xl text-primary-900 sm:text-3xl">
        Alumni Management
      </h1>
      <p className="text-sm text-neutral-600">
        View graduates by intake, add alumni manually, and track prior batch history.
      </p>
      <BranchFilterChip />
    </header>
  );
}
