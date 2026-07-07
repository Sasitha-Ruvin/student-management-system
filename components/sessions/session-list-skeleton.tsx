export function SessionListSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-secondary-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-secondary-300/50 bg-secondary-200/60"
          />
        ))}
      </div>
    </div>
  );
}
