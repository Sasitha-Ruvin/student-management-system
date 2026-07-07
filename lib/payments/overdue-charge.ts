/**
 * Overdue fee proportional to unpaid instalment base (not full instalment amount).
 * Example: settings 2,500, instalment 15,000, paid 7,000 → base 8,000 → fee 2,500 × (8000/15000).
 */
export function computeOverdueChargeForRemainder(
  settingsAmount: number,
  installmentAmount: number,
  baseRemaining: number,
): number {
  if (settingsAmount <= 0 || installmentAmount <= 0 || baseRemaining <= 0) {
    return 0;
  }
  const ratio = Math.min(1, baseRemaining / installmentAmount);
  return Math.round(settingsAmount * ratio * 100) / 100;
}
