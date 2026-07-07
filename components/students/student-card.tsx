"use client";

import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { StudentAvatar } from "@/components/students/student-avatar";
import { StudentSourceBadge } from "@/components/students/student-source-badge";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import { Eye, Pencil } from "@/lib/icons";
import type { StudentListItem } from "@/types/api/student";

type StudentCardProps = {
  student: StudentListItem;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  isNavigating?: boolean;
  onAssign?: () => void;
  onEdit?: () => void;
  onEnroll?: () => void;
  onDelete?: () => void;
};

export function StudentCard({
  student,
  onNavigate,
  onPrefetch,
  isNavigating = false,
  onAssign,
  onEdit,
  onEnroll,
  onDelete,
}: StudentCardProps) {
  return (
    <article
      className="relative flex flex-col rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm sm:p-5"
      onMouseEnter={() => onPrefetch?.(student.id)}
    >
      <LoadingOverlay show={isNavigating} label={`Opening ${student.fullName}`} />

      <header className="mb-4 flex items-start gap-3">
        <StudentAvatar
          studentId={student.id}
          fullName={student.fullName}
          photoUrl={student.photoUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-headline text-lg text-primary-900">{student.fullName}</h2>
            <StudentStatusBadge status={student.enrollmentStatus} />
            <StudentSourceBadge
              source={student.source}
              modelCode={student.modelCode}
            />
          </div>
          <p className="font-mono text-xs text-neutral-600">{student.modelCode}</p>
          <p className="mt-1 text-xs text-neutral-600">{student.email}</p>
        </div>
      </header>

      <dl className="mb-4 space-y-1 text-sm text-neutral-700">
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-500">Batch</dt>
          <dd>{student.currentBatchCode ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-500">Preferred branch</dt>
          <dd className="text-right">
            {student.preferredBranchName ?? student.preferredBranchRaw ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate(student.id)}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100"
        >
          <Eye className="size-4" />
          View details
        </button>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
          >
            <Pencil className="size-4" />
            Edit
          </button>
        ) : null}
        {student.enrollmentStatus === "UNASSIGNED" && onAssign ? (
          <button
            type="button"
            onClick={onAssign}
            className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
          >
            Assign
          </button>
        ) : null}
        {onEnroll && student.enrollmentStatus === "DROPPED" ? (
          <button
            type="button"
            onClick={onEnroll}
            className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
          >
            Enroll in batch
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}
