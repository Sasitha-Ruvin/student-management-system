import { createDecipheriv } from "crypto";

import { getEncryptionKey } from "@/lib/pii-crypto/keys";

export function decryptField(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid ciphertext format");
  }
  const [, ivB64, dataB64, tagB64] = parts;
  const iv = Buffer.from(ivB64!, "base64");
  const data = Buffer.from(dataB64!, "base64");
  const tag = Buffer.from(tagB64!, "base64");
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function decryptOptional(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === "") return null;
  return decryptField(ciphertext);
}

/** Returns null when ciphertext is invalid or the key does not match (rotated keys). */
export function decryptFieldSafe(ciphertext: string): string | null {
  try {
    return decryptField(ciphertext);
  } catch {
    return null;
  }
}

export function decryptOptionalSafe(
  ciphertext: string | null | undefined,
): string | null {
  if (ciphertext == null || ciphertext === "") return null;
  return decryptFieldSafe(ciphertext);
}
