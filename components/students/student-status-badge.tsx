import type { StudentEnrollmentStatus } from "@/types/api/student";

const LABELS: Record<StudentEnrollmentStatus, string> = {
  UNASSIGNED: "Unassigned",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

type StudentStatusBadgeProps = {
  status: StudentEnrollmentStatus | null;
  className?: string;
};

export function StudentStatusBadge({ status, className = "" }: StudentStatusBadgeProps) {
  if (!status) {
    return (
      <span className={["inline-flex rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs text-neutral-600", className].join(" ")}>
        —
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "UNASSIGNED"
          ? "bg-amber-100 text-amber-900"
          : status === "ACTIVE"
            ? "bg-primary-900/10 text-primary-900"
            : status === "SUSPENDED" || status === "ON_HOLD"
              ? "bg-secondary-200 text-neutral-700"
              : "bg-neutral-200 text-neutral-600",
        className,
      ].join(" ")}
    >
      {LABELS[status]}
    </span>
  );
}
