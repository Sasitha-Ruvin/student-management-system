import { Suspense } from "react";

import { BranchDetailPage } from "@/components/branches/branch-detail-page";
import { BranchDetailSkeleton } from "@/components/ui/loading-state";

type BranchDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function BranchDetailRoute({
  params,
}: BranchDetailRouteProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<BranchDetailSkeleton />}>
      <BranchDetailPage branchId={id} />
    </Suspense>
  );
}
