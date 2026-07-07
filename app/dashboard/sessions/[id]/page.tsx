import { SessionDetailPage } from "@/components/sessions/session-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailRoute({ params }: PageProps) {
  const { id } = await params;
  return <SessionDetailPage sessionId={id} />;
}
