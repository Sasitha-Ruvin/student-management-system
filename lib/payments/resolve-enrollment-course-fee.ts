import type { EnrollmentPaymentPath } from "@/types/api/student";

export type BatchPricingSnapshot = {
  courseFee: number;
  oneTimeDiscountAmount: number;
  oneTimePrice: number;
};

/**
 * Resolves the customCourseFee to send when assigning/enrolling a student.
 *
 * - INSTALLMENT: entered value is the base course fee (before any one-time discount).
 * - ONE_TIME: the form shows upfront price; backend expects base course fee and
 *   applies the plan discount when creating the single installment.
 */
export function resolveEnrollmentCourseFee(
  paymentPath: EnrollmentPaymentPath,
  customCourseFeeInput: string,
  pricing: BatchPricingSnapshot | null,
): number | undefined {
  if (customCourseFeeInput.trim() === "") {
    return undefined;
  }

  const entered = Number(customCourseFeeInput);
  if (isNaN(entered) || entered < 0) {
    return undefined;
  }

  if (!pricing) {
    return entered;
  }

  if (paymentPath === "ONE_TIME") {
    if (Math.abs(entered - pricing.oneTimePrice) < 0.01) {
      return undefined;
    }
    return entered + pricing.oneTimeDiscountAmount;
  }

  if (Math.abs(entered - pricing.courseFee) < 0.01) {
    return undefined;
  }

  return entered;
}
