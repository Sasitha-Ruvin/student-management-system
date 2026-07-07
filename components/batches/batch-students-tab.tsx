"use client";

import { useState } from "react";

import { TransferBatchModal } from "@/components/batches/transfer-batch-modal";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { InlineLoader } from "@/components/ui/loading-state";
import { updateEnrollment } from "@/lib/api/batches";
import { formatMoney } from "@/lib/format/money";
import { useBatchStudents } from "@/hooks/use-batch-detail";
import type { BatchDetail, BatchStudentRow, EnrollmentStatus } from "@/types/api/batch";

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  UNASSIGNED: "Unassigned",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

const TRANSFERABLE: EnrollmentStatus[] = ["ACTIVE", "SUSPENDED", "ON_HOLD"];

type BatchStudentsTabProps = {
  batchId: string;
  batch: BatchDetail;
  currency?: string;
};

export function BatchStudentsTab({
  batchId,
  currency = "LKR",
}: BatchStudentsTabProps) {
  const { students, isLoading, error, reload } = useBatchStudents(batchId, true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [transferStudent, setTransferStudent] = useState<BatchStudentRow | null>(
    null,
  );

  async function runAction(
    enrollmentId: string,
    action: Parameters<typeof updateEnrollment>[2],
  ) {
    setBusyId(enrollmentId);
    try {
      await updateEnrollment(batchId, enrollmentId, action);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <InlineLoader label="Loading students…" />;
  if (error) return <p className="text-destructive">{error}</p>;

  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-secondary-400 px-4 py-10 text-center text-neutral-600">
        No students enrolled in this batch yet.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Model code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reg fee</th>
              <th className="px-4 py-3">Paid / Owed</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((row) => (
              <tr
                key={row.enrollmentId}
                className="border-b border-secondary-300/40 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-primary-900">
                  {row.fullName}
                </td>
                <td className="px-4 py-3 font-mono text-neutral-700">
                  {row.modelCode}
                </td>
                <td className="px-4 py-3">{STATUS_LABELS[row.status]}</td>
                <td className="px-4 py-3">{row.regFeePaid ? "Paid" : "Pending"}</td>
                <td className="px-4 py-3">
                  {formatMoney(row.totalPaid, currency)} /{" "}
                  {formatMoney(row.totalOwed, currency)}
                </td>
                <td className="px-4 py-3">
                  <ActionMenu triggerLabel={`Actions for ${row.fullName}`}>
                    {TRANSFERABLE.includes(row.status) ? (
                      <ActionMenuItem
                        disabled={busyId === row.enrollmentId}
                        onClick={() => setTransferStudent(row)}
                      >
                        Transfer to another batch
                      </ActionMenuItem>
                    ) : null}
                    {row.status !== "DROPPED" && row.status !== "COMPLETED" ? (
                      <>
                        <ActionMenuItem
                          disabled={busyId === row.enrollmentId}
                          onClick={() =>
                            void runAction(row.enrollmentId, { action: "suspend" })
                          }
                        >
                          Suspend
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() =>
                            void runAction(row.enrollmentId, { action: "hold" })
                          }
                        >
                          Put on hold
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() =>
                            void runAction(row.enrollmentId, { action: "activate" })
                          }
                        >
                          Activate
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() =>
                            void runAction(row.enrollmentId, { action: "drop" })
                          }
                        >
                          Drop
                        </ActionMenuItem>
                      </>
                    ) : null}
                    {row.status === "DROPPED" ? (
                      <ActionMenuItem
                        onClick={() =>
                          void runAction(row.enrollmentId, { action: "activate" })
                        }
                      >
                        Re-activate in this batch
                      </ActionMenuItem>
                    ) : null}
                  </ActionMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transferStudent ? (
        <TransferBatchModal
          open
          sourceBatchId={batchId}
          student={transferStudent}
          onClose={() => setTransferStudent(null)}
          onSuccess={() => {
            setTransferStudent(null);
            void reload();
          }}
        />
      ) : null}
    </>
  );
}
