export function BranchStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isActive
          ? "bg-secondary-300 text-primary-900"
          : "bg-neutral-200 text-neutral-700",
      ].join(" ")}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
