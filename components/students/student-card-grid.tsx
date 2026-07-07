"use client";

import { StudentCard } from "@/components/students/student-card";
import type { StudentListItem } from "@/types/api/student";

type StudentCardGridProps = {
  students: StudentListItem[];
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingStudentId?: string | null;
  onAssign?: (student: StudentListItem) => void;
  onEdit?: (student: StudentListItem) => void;
  onEnroll?: (student: StudentListItem) => void;
  onDelete?: (student: StudentListItem) => void;
};

export function StudentCardGrid({
  students,
  onNavigate,
  onPrefetch,
  navigatingStudentId,
  onAssign,
  onEdit,
  onEnroll,
  onDelete,
}: StudentCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          onNavigate={onNavigate}
          onPrefetch={onPrefetch}
          isNavigating={navigatingStudentId === student.id}
          onAssign={onAssign ? () => onAssign(student) : undefined}
          onEdit={onEdit ? () => onEdit(student) : undefined}
          onEnroll={onEnroll ? () => onEnroll(student) : undefined}
          onDelete={onDelete ? () => onDelete(student) : undefined}
        />
      ))}
    </div>
  );
}
