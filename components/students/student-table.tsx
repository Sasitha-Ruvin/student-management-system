"use client";

import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { StudentAvatar } from "@/components/students/student-avatar";
import { StudentSourceBadge } from "@/components/students/student-source-badge";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import type { EnrollmentAction } from "@/types/api/batch";
import type { StudentListItem } from "@/types/api/student";

type StudentTableProps = {
  students: StudentListItem[];
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingStudentId?: string | null;
  onAssign?: (student: StudentListItem) => void;
  onEdit?: (student: StudentListItem) => void;
  onEnroll?: (student: StudentListItem) => void;
  onCreatePortal?: (student: StudentListItem) => void;
  onDisablePortal?: (student: StudentListItem) => void;
  onChangePortalPassword?: (student: StudentListItem) => void;
  onDelete?: (student: StudentListItem) => void;
  onEnrollmentAction?: (
    student: StudentListItem,
    action: EnrollmentAction,
  ) => void;
  busyStudentId?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StudentTable({
  students,
  onNavigate,
  onPrefetch,
  navigatingStudentId,
  onAssign,
  onEdit,
  onEnroll,
  onCreatePortal,
  onDisablePortal,
  onChangePortalPassword,
  onDelete,
  onEnrollmentAction,
  busyStudentId,
}: StudentTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-secondary-300/60 text-[11px] uppercase tracking-wide text-neutral-600">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Model code</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Batch</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Registered</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const busy = busyStudentId === student.id;
            const canEnrollAction =
              student.primaryEnrollmentId &&
              student.primaryBatchId &&
              onEnrollmentAction;

            return (
              <tr
                key={student.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(student.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigate(student.id);
                  }
                }}
                className={`cursor-pointer border-b border-secondary-300/40 last:border-0 hover:bg-secondary-100/50 ${
                  navigatingStudentId === student.id
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
                onMouseEnter={() => onPrefetch?.(student.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      studentId={student.id}
                      fullName={student.fullName}
                      photoUrl={student.photoUrl}
                      size="sm"
                      showSpinner={navigatingStudentId === student.id}
                    />
                    <span>
                      <span className="block font-medium text-primary-900">
                        {student.fullName}
                      </span>
                      <span className="text-xs text-neutral-600">{student.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-neutral-700">
                  {student.modelCode}
                </td>
                <td className="px-4 py-3">
                  <StudentStatusBadge status={student.enrollmentStatus} />
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {student.currentBatchCode ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StudentSourceBadge
                    source={student.source}
                    modelCode={student.modelCode}
                  />
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {formatDate(student.createdAt)}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu triggerLabel={`Actions for ${student.fullName}`}>
                    <ActionMenuItem
                      disabled={busy}
                      onClick={() => onNavigate(student.id)}
                    >
                      View details
                    </ActionMenuItem>
                    {onEdit ? (
                      <ActionMenuItem disabled={busy} onClick={() => onEdit(student)}>
                        Edit student
                      </ActionMenuItem>
                    ) : null}
                    {student.enrollmentStatus === "UNASSIGNED" && onAssign ? (
                      <ActionMenuItem disabled={busy} onClick={() => onAssign(student)}>
                        Assign to batch
                      </ActionMenuItem>
                    ) : null}
                    {onEnroll &&
                    (student.enrollmentStatus === "DROPPED" ||
                      student.enrollmentStatus === "ACTIVE") ? (
                      <ActionMenuItem disabled={busy} onClick={() => onEnroll(student)}>
                        {student.enrollmentStatus === "DROPPED"
                          ? "Enroll in batch"
                          : "Add to another batch"}
                      </ActionMenuItem>
                    ) : null}
                    {student.enrollmentStatus === "DROPPED" && canEnrollAction ? (
                      <ActionMenuItem
                        disabled={busy}
                        onClick={() =>
                          onEnrollmentAction!(student, { action: "activate" })
                        }
                      >
                        Re-activate in current batch
                      </ActionMenuItem>
                    ) : null}
                    {!student.hasPortalAccount && onCreatePortal ? (
                      <ActionMenuItem
                        disabled={busy}
                        onClick={() => onCreatePortal(student)}
                      >
                        Create portal account
                      </ActionMenuItem>
                    ) : null}
                    {student.hasPortalAccount && onChangePortalPassword ? (
                      <ActionMenuItem
                        disabled={busy}
                        onClick={() => onChangePortalPassword(student)}
                      >
                        Change portal password
                      </ActionMenuItem>
                    ) : null}
                    {student.hasPortalAccount &&
                    student.isLoginEnabled &&
                    onDisablePortal ? (
                      <ActionMenuItem
                        disabled={busy}
                        onClick={() => onDisablePortal(student)}
                      >
                        Disable portal
                      </ActionMenuItem>
                    ) : null}
                    {student.enrollmentStatus === "ACTIVE" && canEnrollAction ? (
                      <>
                        <ActionMenuItem
                          disabled={busy}
                          onClick={() =>
                            onEnrollmentAction(student, { action: "suspend" })
                          }
                        >
                          Suspend enrollment
                        </ActionMenuItem>
                        <ActionMenuItem
                          disabled={busy}
                          onClick={() =>
                            onEnrollmentAction(student, { action: "hold" })
                          }
                        >
                          Put on hold
                        </ActionMenuItem>
                        <ActionMenuItem
                          disabled={busy}
                          className="text-destructive"
                          onClick={() =>
                            onEnrollmentAction(student, { action: "drop" })
                          }
                        >
                          Drop from batch
                        </ActionMenuItem>
                      </>
                    ) : null}
                    {(student.enrollmentStatus === "SUSPENDED" ||
                      student.enrollmentStatus === "ON_HOLD") &&
                    canEnrollAction ? (
                      <ActionMenuItem
                        disabled={busy}
                        onClick={() =>
                          onEnrollmentAction(student, { action: "activate" })
                        }
                      >
                        Activate enrollment
                      </ActionMenuItem>
                    ) : null}
                    {onDelete ? (
                      <ActionMenuItem
                        disabled={busy}
                        className="text-destructive"
                        onClick={() => onDelete(student)}
                      >
                        Delete student
                      </ActionMenuItem>
                    ) : null}
                  </ActionMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
