"use client";

import {
  ActionMenu,
  ActionMenuItem,
} from "@/components/ui/action-menu";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Spinner } from "@/components/ui/spinner";
import { MapPin } from "@/lib/icons";
import type { BranchListItemDto } from "@/types/api/branch";

import { BranchStatusBadge } from "./branch-status-badge";

type BranchCardProps = {
  branch: BranchListItemDto;
  onDeactivate: (branch: BranchListItemDto) => void;
  onEdit?: (id: string) => void;
  onNavigate: (id: string) => void;
  onPrefetch?: (id: string) => void;
  isNavigating?: boolean;
  isDeactivating?: boolean;
};

export function BranchCard({
  branch,
  onDeactivate,
  onEdit,
  onNavigate,
  onPrefetch,
  isNavigating = false,
  isDeactivating = false,
}: BranchCardProps) {
  const isBusy = isNavigating || isDeactivating;

  return (
    <article
      className={[
        "relative isolate w-full rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm transition-opacity sm:p-5",
        isBusy ? "pointer-events-none" : "cursor-pointer hover:border-secondary-400/80",
      ].join(" ")}
      onClick={() => onNavigate(branch.id)}
      onMouseEnter={() => onPrefetch?.(branch.id)}
      onFocus={() => onPrefetch?.(branch.id)}
    >
      <LoadingOverlay
        show={isNavigating}
        label={`Opening ${branch.name}`}
      />

      <header className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <h2 className="block font-headline text-xl leading-tight text-primary-900 sm:text-2xl">
            {branch.name}
          </h2>
          <p className="mt-1 font-mono text-xs tracking-wide text-neutral-600">
            {branch.branchCode}
          </p>
          <div className="mt-2">
            <BranchStatusBadge isActive={branch.isActive} />
          </div>
        </div>
        <div
          className="relative z-30 shrink-0"
          data-action-menu
          onClick={(e) => e.stopPropagation()}
        >
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
                disabled={isDeactivating || branch.activeStudentCount > 0}
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
        </div>
      </header>

      <p className="mb-4 flex items-start gap-2 text-sm text-neutral-700">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="break-words">{branch.location}</span>
      </p>

      <footer className="grid grid-cols-2 gap-4 border-t border-secondary-300/60 pt-4">
        <div>
          <p className="text-[11px] tracking-wide text-neutral-600 uppercase">
            Students
          </p>
          <p className="font-headline text-2xl text-primary-900">
            {branch.activeStudentCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] tracking-wide text-neutral-600 uppercase">
            Batches
          </p>
          <p className="font-headline text-2xl text-primary-900">
            {branch.activeBatchCount}
          </p>
        </div>
      </footer>
    </article>
  );
}
