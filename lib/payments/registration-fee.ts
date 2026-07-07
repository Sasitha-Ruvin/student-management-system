import type { PaymentSensitiveDbRow } from "@/lib/payments/payment-sensitive";
import { decryptPaymentSensitive } from "@/lib/payments/payment-sensitive";
import { REG_FEE_NOTE_PREFIX } from "@/lib/payments/reg-fee-constants";

export { REG_FEE_NOTE_PREFIX };

export function regFeePaymentTag(enrollmentId: string): string {
  return `${REG_FEE_NOTE_PREFIX}${enrollmentId}`;
}

/** User-visible notes only (encrypted in DB). System tag uses paymentTag. */
export function buildRegFeeUserNotes(userNotes?: string | null): string | null {
  const trimmed = userNotes?.trim();
  return trimmed || null;
}

export function parseRegFeeEnrollmentId(
  row: PaymentSensitiveDbRow | string | null,
): string | null {
  if (row === null) return null;
  if (typeof row === "string") {
    if (!row.startsWith(REG_FEE_NOTE_PREFIX)) return null;
    return row.slice(REG_FEE_NOTE_PREFIX.length).split("\n")[0]?.trim() || null;
  }
  if (row.paymentTag?.startsWith(REG_FEE_NOTE_PREFIX)) {
    return row.paymentTag.slice(REG_FEE_NOTE_PREFIX.length) || null;
  }
  const plain = decryptPaymentSensitive(row);
  if (!plain.notes?.startsWith(REG_FEE_NOTE_PREFIX)) return null;
  return plain.notes.slice(REG_FEE_NOTE_PREFIX.length).split("\n")[0]?.trim() || null;
}

export function isRegistrationFeePayment(
  rowOrNotes: PaymentSensitiveDbRow | string | null,
): boolean {
  if (rowOrNotes === null) return false;
  if (typeof rowOrNotes === "string") {
    return rowOrNotes.startsWith(REG_FEE_NOTE_PREFIX);
  }
  if (rowOrNotes.paymentTag?.startsWith(REG_FEE_NOTE_PREFIX)) return true;
  const plain = decryptPaymentSensitive(rowOrNotes);
  return plain.notes?.startsWith(REG_FEE_NOTE_PREFIX) ?? false;
}

export function registrationFeeDisplayLabel(
  rowOrNotes: PaymentSensitiveDbRow | string | null,
  batchCode: string | null,
): string {
  if (!isRegistrationFeePayment(rowOrNotes)) return "Registration fee";
  return batchCode ? `Registration fee — ${batchCode}` : "Registration fee";
}
