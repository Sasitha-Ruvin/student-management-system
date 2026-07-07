export function formatMoney(
  amount: number,
  currency = "LKR",
  options?: { compact?: boolean },
) {
  if (options?.compact && amount >= 1000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value}%`;
}
