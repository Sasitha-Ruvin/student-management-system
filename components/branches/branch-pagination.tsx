"use client";

import { ChevronLeft, ChevronRight } from "@/lib/icons";

type BranchPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function BranchPagination({
  page,
  totalPages,
  onPageChange,
}: BranchPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex shrink-0 items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex size-11 items-center justify-center rounded-xl border border-secondary-400 bg-tertiary-100 active:bg-secondary-200 disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={[
              "min-h-11 min-w-11 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
              p === page
                ? "bg-primary-900 text-tertiary-100"
                : "text-neutral-700 hover:bg-secondary-200",
            ].join(" ")}
          >
            {p}
          </button>
        ))}
      </div>

      <span className="text-sm text-neutral-700 sm:hidden">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex size-11 items-center justify-center rounded-xl border border-secondary-400 bg-tertiary-100 active:bg-secondary-200 disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
