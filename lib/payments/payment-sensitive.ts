import { decryptOptional, encryptOptional } from "@/lib/pii-crypto";
import { REG_FEE_NOTE_PREFIX } from "@/lib/payments/reg-fee-constants";

export const PAYMENT_SENSITIVE_SELECT = {
  paymentTag: true,
  reference: true,
  referenceEnc: true,
  notes: true,
  notesEnc: true,
  voidReason: true,
  voidReasonEnc: true,
} as const;

export type PaymentSensitiveDbRow = {
  paymentTag: string | null;
  reference: string | null;
  referenceEnc: string | null;
  notes: string | null;
  notesEnc: string | null;
  voidReason: string | null;
  voidReasonEnc: string | null;
};

export type PaymentSensitivePlain = {
  paymentTag: string | null;
  reference: string | null;
  notes: string | null;
  voidReason: string | null;
};

export function decryptPaymentSensitive(
  row: PaymentSensitiveDbRow,
): PaymentSensitivePlain {
  return {
    paymentTag: row.paymentTag,
    reference: decryptOptional(row.referenceEnc) ?? row.reference,
    notes: decryptOptional(row.notesEnc) ?? row.notes,
    voidReason: decryptOptional(row.voidReasonEnc) ?? row.voidReason,
  };
}

type EncryptedPaymentFields = {
  paymentTag?: string | null;
  reference?: string | null;
  referenceEnc?: string | null;
  notes?: string | null;
  notesEnc?: string | null;
  voidReason?: string | null;
  voidReasonEnc?: string | null;
};

export function encryptPaymentSensitiveForWrite(input: {
  paymentTag?: string | null;
  reference?: string | null;
  notes?: string | null;
  voidReason?: string | null;
}): EncryptedPaymentFields {
  const data: EncryptedPaymentFields = {};

  if (input.paymentTag !== undefined) {
    data.paymentTag = input.paymentTag;
  }
  if (input.reference !== undefined) {
    data.referenceEnc = encryptOptional(input.reference?.trim() || null);
    data.reference = input.reference?.trim() || null;
  }
  if (input.notes !== undefined) {
    data.notesEnc = encryptOptional(input.notes?.trim() || null);
    data.notes = input.notes?.trim() || null;
  }
  if (input.voidReason !== undefined) {
    data.voidReasonEnc = encryptOptional(input.voidReason?.trim() || null);
    data.voidReason = input.voidReason?.trim() || null;
  }

  return data;
}

export function isRegistrationFeeRow(row: PaymentSensitiveDbRow): boolean {
  if (row.paymentTag?.startsWith(REG_FEE_NOTE_PREFIX)) return true;
  const notes = decryptOptional(row.notesEnc) ?? row.notes;
  return notes?.startsWith(REG_FEE_NOTE_PREFIX) ?? false;
}

export function parseRegFeeEnrollmentIdFromRow(
  row: PaymentSensitiveDbRow,
): string | null {
  if (row.paymentTag?.startsWith(REG_FEE_NOTE_PREFIX)) {
    return row.paymentTag.slice(REG_FEE_NOTE_PREFIX.length) || null;
  }
  const notes = decryptOptional(row.notesEnc) ?? row.notes;
  if (!notes?.startsWith(REG_FEE_NOTE_PREFIX)) return null;
  const rest = notes.slice(REG_FEE_NOTE_PREFIX.length);
  return rest.split("\n")[0]?.trim() || null;
}

export const ENROLLMENT_NOTES_SELECT = {
  notes: true,
  notesEnc: true,
} as const;

export function decryptEnrollmentNotes(row: {
  notes: string | null;
  notesEnc?: string | null;
}): string | null {
  return decryptOptional(row.notesEnc) ?? row.notes;
}

export function encryptEnrollmentNotesForWrite(notes: string | null | undefined): {
  notes: string | null;
  notesEnc: string | null;
} {
  const trimmed = notes?.trim() || null;
  return {
    notesEnc: encryptOptional(trimmed),
    notes: trimmed,
  };
}
