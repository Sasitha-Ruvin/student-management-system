import { createCipheriv, randomBytes } from "crypto";

import { getEncryptionKey } from "@/lib/pii-crypto/keys";

const VERSION = "v1";
const IV_LENGTH = 12;

export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function encryptOptional(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return encryptField(value);
}
