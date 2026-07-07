import { decryptField, encryptField } from "@/lib/pii-crypto";

export function encryptWebhookPayload(payload: unknown): string {
  return encryptField(JSON.stringify(payload));
}

export function decryptWebhookPayload(payloadEnc: string | null | undefined): unknown {
  if (!payloadEnc) return null;
  return JSON.parse(decryptField(payloadEnc)) as unknown;
}
