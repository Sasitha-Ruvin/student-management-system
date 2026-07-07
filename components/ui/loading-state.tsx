import { Spinner } from "@/components/ui/spinner";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={["animate-pulse rounded-lg bg-secondary-200/70", className].join(
        " ",
      )}
      aria-hidden
    />
  );
}

type PageLoaderProps = {
  label?: string;
  className?: string;
};

export function PageLoader({
  label = "Loading…",
  className = "",
}: PageLoaderProps) {
  return (
    <div
      role="status"
      className={[
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 text-neutral-600",
        className,
      ].join(" ")}
    >
      <Spinner className="size-8 text-primary-900" label={label} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function InlineLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
      <Spinner className="size-4 text-primary-900" label={label} />
      {label}
    </span>
  );
}

export function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BatchStatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4 shadow-sm"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BranchListSkeleton({
  variant = "cards",
}: {
  variant?: "cards" | "table";
}) {
  if (variant === "table") {
    return (
      <div className="min-w-[640px] animate-pulse rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4">
        <Skeleton className="mb-4 h-4 w-full max-w-md" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm"
        >
          <Skeleton className="mb-3 h-7 w-3/4 max-w-[200px]" />
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="mb-4 h-5 w-16 rounded-full" />
          <Skeleton className="mb-4 h-4 w-full" />
          <div className="grid grid-cols-2 gap-4 border-t border-secondary-300/60 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BranchDetailSkeleton() {
  return (
    <div className="space-y-6 pb-6" aria-busy="true" aria-label="Loading branch">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export const BatchListSkeleton = BranchListSkeleton;
export const BatchDetailSkeleton = BranchDetailSkeleton;

export function SettingsPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-full max-w-2xl rounded-xl" />
      <div className="flex-1 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-6">
        <Skeleton className="mb-6 h-7 w-40" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full max-w-md" />
          ))}
        </div>
        <Skeleton className="mt-8 h-11 w-40 rounded-xl" />
      </div>
    </div>
  );
}
