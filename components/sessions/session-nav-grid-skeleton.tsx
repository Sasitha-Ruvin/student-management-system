export function SessionNavGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-secondary-300/40 bg-secondary-100/60"
        />
      ))}
    </div>
  );
}
