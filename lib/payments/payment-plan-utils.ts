export function computeOneTimePrice(
  courseFee: number,
  oneTimeDiscountAmount: number,
): number {
  return Math.max(0, courseFee - oneTimeDiscountAmount);
}

export function computeDiscountFromUpfront(
  courseFee: number,
  oneTimePrice: number,
): number {
  return Math.max(0, Math.min(courseFee, courseFee - oneTimePrice));
}

export function computeInstallmentSubtotal(
  lineItems: { amount: number }[],
): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}
