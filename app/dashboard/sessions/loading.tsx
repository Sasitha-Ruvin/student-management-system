import { SessionListSkeleton } from "@/components/sessions/session-list-skeleton";

export default function SessionsLoading() {
  return (
    <div className="p-4 sm:p-6">
      <SessionListSkeleton />
    </div>
  );
}
