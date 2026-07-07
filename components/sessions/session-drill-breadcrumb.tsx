"use client";

type SessionDrillBreadcrumbProps = {
  branchLabel?: string | null;
  batchLabel?: string | null;
  onSessions: () => void;
  onBranch?: () => void;
  onBatches?: () => void;
};

export function SessionDrillBreadcrumb({
  branchLabel,
  batchLabel,
  onSessions,
  onBranch,
  onBatches,
}: SessionDrillBreadcrumbProps) {
  return (
    <nav
      aria-label="Session navigation"
      className="flex flex-wrap items-center gap-1.5 text-sm text-neutral-600"
    >
      <button
        type="button"
        onClick={onSessions}
        className="font-medium text-primary-900 hover:underline"
      >
        Sessions
      </button>
      {branchLabel ? (
        <>
          <span aria-hidden>/</span>
          {onBranch ? (
            <button
              type="button"
              onClick={onBranch}
              className="font-medium text-primary-900 hover:underline"
            >
              {branchLabel}
            </button>
          ) : (
            <span className="text-neutral-800">{branchLabel}</span>
          )}
        </>
      ) : null}
      {batchLabel ? (
        <>
          <span aria-hidden>/</span>
          {onBatches ? (
            <button
              type="button"
              onClick={onBatches}
              className="font-medium text-primary-900 hover:underline"
            >
              {batchLabel}
            </button>
          ) : (
            <span className="text-neutral-800">{batchLabel}</span>
          )}
        </>
      ) : null}
    </nav>
  );
}
