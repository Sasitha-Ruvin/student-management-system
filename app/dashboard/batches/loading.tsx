import {
  BatchListSkeleton,
  BatchStatsRowSkeleton,
} from "@/components/ui/loading-state";

export default function BatchesLoading() {
  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <BatchStatsRowSkeleton />
      <BatchListSkeleton variant="cards" />
    </div>
  );
}
