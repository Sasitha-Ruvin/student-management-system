import {
  recordPaymentCascade,
  type RecordPaymentCascadeResult,
} from "@/lib/payments/record-payment-cascade";
import type { RecordPaymentRequest } from "@/types/api/payment";

export type RecordPaymentResult = RecordPaymentCascadeResult;

/**
 * Records a payment against an instalment; surplus cascades to later instalments
 * on the same enrollment (one Payment + Invoice per slice).
 */
export async function recordPayment(
  data: RecordPaymentRequest,
  recordedById: string,
): Promise<RecordPaymentResult> {
  return recordPaymentCascade(data, recordedById);
}
