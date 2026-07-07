import { BranchFilterChip } from "@/components/ui/branch-filter-chip";

export function PaymentPageHeader() {
  return (
    <header className="space-y-2">
      <h1 className="font-headline text-2xl text-primary-900 sm:text-3xl">
        Payment Management
      </h1>
      <p className="text-sm text-neutral-600">
        Record instalment payments by batch and track collection status.
      </p>
      <BranchFilterChip />
    </header>
  );
}
