import type { BatchStatus } from "@/types/api/batch";

const LABELS: Record<BatchStatus, string> = {
  OPEN: "Registration Open",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CLOSED: "Cancelled",
};

type BatchStatusBadgeProps = {
  status: BatchStatus;
  className?: string;
};

export function BatchStatusBadge({ status, className = "" }: BatchStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "OPEN"
          ? "bg-secondary-200 text-primary-900"
          : status === "ACTIVE"
            ? "bg-primary-900/10 text-primary-900"
            : status === "CLOSED"
              ? "bg-amber-100 text-amber-900"
              : "bg-neutral-200 text-neutral-700",
        className,
      ].join(" ")}
    >
      {LABELS[status]}
    </span>
  );
}
