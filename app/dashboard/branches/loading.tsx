import { BranchListSkeleton } from "@/components/ui/loading-state";

export default function BranchesLoading() {
  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <BranchListSkeleton variant="cards" />
    </div>
  );
}
