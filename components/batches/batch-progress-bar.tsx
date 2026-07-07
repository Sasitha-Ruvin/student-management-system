type BatchProgressBarProps = {
  label: string;
  current: number;
  total: number;
  formatValue?: (current: number, total: number) => string;
};

export function BatchProgressBar({
  label,
  current,
  total,
  formatValue,
}: BatchProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.min(100, Math.round((current / safeTotal) * 100));
  const display =
    formatValue?.(current, total) ??
    (total > 0 ? `${current}/${total}` : `${current}`);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-700">{label}</span>
        <span className="font-medium text-primary-900">{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary-200">
        <div
          className="h-full rounded-full bg-primary-900 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
