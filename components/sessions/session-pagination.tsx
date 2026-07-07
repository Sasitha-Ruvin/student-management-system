"use client";

import { ChevronLeft, ChevronRight } from "@/lib/icons";

type SessionPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function SessionPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: SessionPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-neutral-600">
        Page {page} of {totalPages} · {total} sessions
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-10 items-center justify-center rounded-xl border border-secondary-400 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex size-10 items-center justify-center rounded-xl border border-secondary-400 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
