import type {
  CreatePaymentPlanBody,
  PaymentPlanLineItemInput,
  UpdatePaymentPlanBody,
} from "@/types/api/settings";

export function validateLineItems(
  lineItems: PaymentPlanLineItemInput[] | undefined,
): string | null {
  if (!lineItems || lineItems.length === 0) {
    return "At least one installment line item is required";
  }

  for (const item of lineItems) {
    if (!item.label?.trim()) {
      return "Each line item must have a label";
    }
    if (item.amount < 0) {
      return "Line item amounts must be non-negative";
    }
  }

  return null;
}

export function validatePaymentPlanBody(
  body: CreatePaymentPlanBody | UpdatePaymentPlanBody,
  options: { requireName?: boolean; requireFees?: boolean } = {},
): string | null {
  const { requireName = false, requireFees = false } = options;

  if (requireName && !body.name?.trim()) {
    return "name is required";
  }

  if (body.registrationFee !== undefined && body.registrationFee < 0) {
    return "registrationFee must be non-negative";
  }

  if (body.courseFee !== undefined && body.courseFee < 0) {
    return "courseFee must be non-negative";
  }

  if (body.oneTimeDiscountAmount !== undefined && body.oneTimeDiscountAmount < 0) {
    return "oneTimeDiscountAmount must be non-negative";
  }

  if (
    body.courseFee !== undefined &&
    body.oneTimeDiscountAmount !== undefined &&
    body.oneTimeDiscountAmount > body.courseFee
  ) {
    return "oneTimeDiscountAmount cannot exceed courseFee";
  }

  if (body.lineItems !== undefined) {
    const lineError = validateLineItems(body.lineItems);
    if (lineError) return lineError;
  }

  if (requireFees) {
    if (body.registrationFee === undefined || body.courseFee === undefined) {
      return "registrationFee and courseFee are required";
    }
    if (body.oneTimeDiscountAmount === undefined) {
      return "oneTimeDiscountAmount is required";
    }
    const lineError = validateLineItems(body.lineItems);
    if (lineError) return lineError;
  }

  return null;
}
