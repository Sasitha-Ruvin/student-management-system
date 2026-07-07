import type { InstallmentStatus } from "@/types/api/payment";

const STYLES: Record<InstallmentStatus, string> = {
  PAID: "bg-green-100 text-green-800",
  PENDING: "bg-secondary-200/80 text-neutral-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-neutral-200 text-neutral-600",
};

const LABELS: Record<InstallmentStatus, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
