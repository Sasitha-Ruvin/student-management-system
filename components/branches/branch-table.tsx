"use client";

import {
  ActionMenu,
  ActionMenuItem,
} from "@/components/ui/action-menu";
import { Spinner } from "@/components/ui/spinner";
import type { BranchListItemDto } from "@/types/api/branch";

import { BranchStatusBadge } from "./branch-status-badge";

type BranchTableProps = {
  branches: BranchListItemDto[];
  onDeactivate: (branch: BranchListItemDto) => void;
  onEdit?: (id: string) => void;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  navigatingBranchId?: string | null;
  deactivatingBranchId?: string | null;
};

export function BranchTable({
  branches,
  onDeactivate,
  onEdit,
  onNavigate,
  onPrefetch,
  navigatingBranchId = null,
  deactivatingBranchId = null,
}: BranchTableProps) {
  if (branches.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-neutral-600">
        No branches match your filters.
      </p>
    );
  }

  return (
    <div className="-mx-1 h-full overflow-x-auto overscroll-x-contain px-1 pb-1">
      <div className="min-w-[640px] rounded-2xl border border-secondary-300/50 bg-tertiary-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary-300/60 text-[11px] tracking-wide text-neutral-600 uppercase">
              <th className="px-4 py-3 font-medium sm:px-5">Name</th>
              <th className="px-4 py-3 font-medium sm:px-5">Code</th>
              <th className="px-4 py-3 font-medium sm:px-5">Status</th>
              <th className="px-4 py-3 font-medium sm:px-5">Location</th>
              <th className="px-4 py-3 font-medium sm:px-5">Students</th>
              <th className="px-4 py-3 font-medium sm:px-5">Batches</th>
              <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const isNavigating = navigatingBranchId === branch.id;
              const isDeactivating = deactivatingBranchId === branch.id;

              return (
                <tr
                  key={branch.id}
                  className={[
                    "border-b border-secondary-300/40 last:border-0 hover:bg-secondary-100/50",
                    isNavigating ? "bg-secondary-100/70" : "",
                  ].join(" ")}
                  onMouseEnter={() => onPrefetch?.(branch.id)}
                >
                  <td className="px-4 py-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onNavigate(branch.id)}
                      disabled={isNavigating}
                      className="inline-flex items-center gap-2 text-left font-headline text-base text-primary-900 hover:underline disabled:opacity-70 sm:text-lg"
                    >
                      {isNavigating ? (
                        <Spinner
                          className="size-4 shrink-0"
                          label={`Opening ${branch.name}`}
                        />
                      ) : null}
                      {branch.name}
                    </button>
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-neutral-700 sm:px-5">
                    {branch.branchCode}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <BranchStatusBadge isActive={branch.isActive} />
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-4 text-neutral-700 sm:px-5">
                    {branch.location}
                  </td>
                  <td className="px-4 py-4 font-headline text-lg text-primary-900 sm:px-5">
                    {branch.activeStudentCount}
                  </td>
                  <td className="px-4 py-4 font-headline text-lg text-primary-900 sm:px-5">
                    {branch.activeBatchCount}
                  </td>
                  <td className="px-4 py-4 sm:px-5">
                    <ActionMenu triggerLabel={`Actions for ${branch.name}`}>
                      <ActionMenuItem onClick={() => onNavigate(branch.id)}>
                        View details
                      </ActionMenuItem>
                      {onEdit ? (
                        <ActionMenuItem onClick={() => onEdit(branch.id)}>
                          Edit
                        </ActionMenuItem>
                      ) : null}
                      {branch.isActive ? (
                        <ActionMenuItem
                          disabled={
                            isDeactivating || branch.activeStudentCount > 0
                          }
                          title={
                            branch.activeStudentCount > 0
                              ? "Cannot deactivate while students are enrolled in open batches"
                              : undefined
                          }
                          onClick={() => onDeactivate(branch)}
                        >
                          {isDeactivating ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner className="size-3.5" label="Deactivating" />
                              Deactivating…
                            </span>
                          ) : (
                            "Deactivate"
                          )}
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
    </div>
  );
}
