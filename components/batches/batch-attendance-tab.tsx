"use client";

import { InlineLoader } from "@/components/ui/loading-state";
import { updateAttendanceCell } from "@/lib/api/batches";
import { useBatchAttendance } from "@/hooks/use-batch-detail";
import type { AttendanceStatus } from "@/types/api/batch";

const CYCLE: (AttendanceStatus | null)[] = [null, "PRESENT", "ABSENT", "LATE"];

type BatchAttendanceTabProps = {
  batchId: string;
};

export function BatchAttendanceTab({ batchId }: BatchAttendanceTabProps) {
  const { grid, isLoading, error, reload } = useBatchAttendance(batchId, true);

  async function toggleCell(studentId: string, sessionId: string) {
    if (!grid) return;
    const current = grid.cells[studentId]?.[sessionId] ?? null;
    const idx = CYCLE.indexOf(current);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    await updateAttendanceCell(batchId, { studentId, sessionId, status: next });
    await reload();
  }

  if (isLoading) return <InlineLoader label="Loading attendance…" />;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!grid) return null;

  if (grid.students.length === 0 || grid.sessions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-secondary-400 px-4 py-10 text-center text-neutral-600">
        No students or sessions to display.
      </p>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-tertiary-100 px-3 py-2 text-left font-medium">
              Student
            </th>
            {grid.sessions.map((s) => (
              <th
                key={s.sessionId}
                className="min-w-[3rem] px-2 py-2 text-center text-[10px] font-medium text-neutral-600"
              >
                {s.sessionNumber}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.students.map((student) => (
            <tr key={student.studentId} className="border-t border-secondary-300/40">
              <td className="sticky left-0 z-10 bg-tertiary-100 px-3 py-2 font-medium whitespace-nowrap">
                {student.fullName}
              </td>
              {grid.sessions.map((session) => {
                const status =
                  grid.cells[student.studentId]?.[session.sessionId] ?? null;
                return (
                  <td key={session.sessionId} className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        void toggleCell(student.studentId, session.sessionId)
                      }
                      disabled={session.status === "CANCELLED"}
                      className={[
                        "min-h-9 min-w-9 rounded-lg text-xs font-bold",
                        status === "PRESENT"
                          ? "bg-green-100 text-green-800"
                          : status === "ABSENT"
                            ? "bg-red-100 text-red-800"
                            : status === "LATE"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-secondary-100 text-neutral-500",
                        "disabled:opacity-40",
                      ].join(" ")}
                    >
                      {status === "PRESENT"
                        ? "P"
                        : status === "ABSENT"
                          ? "A"
                          : status === "LATE"
                            ? "L"
                            : "—"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
