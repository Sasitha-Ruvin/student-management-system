import { BatchDetailPage } from "@/components/batches/batch-detail-page";

type BatchDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchDetailRoute({ params }: BatchDetailRouteProps) {
  const { id } = await params;
  return <BatchDetailPage batchId={id} />;
}
