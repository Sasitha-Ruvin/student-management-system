import { createHmac, randomBytes } from "crypto";

const ENC_KEY_ENV = "DATA_ENCRYPTION_KEY";
const HMAC_KEY_ENV = "SEARCH_HMAC_KEY";

function decodeKey(envName: string): Buffer {
  const raw = process.env[envName]?.trim();
  if (!raw) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }

  // 64-char hex (32 bytes) — same format edge functions accept
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `${envName} must be 32 bytes (base64-encoded or 64-char hex)`,
    );
  }
  return buf;
}

let encKey: Buffer | null = null;
let hmacKey: Buffer | null = null;

export function getEncryptionKey(): Buffer {
  if (!encKey) encKey = decodeKey(ENC_KEY_ENV);
  return encKey;
}

export function getSearchHmacKey(): Buffer {
  if (!hmacKey) hmacKey = decodeKey(HMAC_KEY_ENV);
  return hmacKey;
}

/** Generate a random 32-byte key as base64 (for setup). */
export function generateKeyBase64(): string {
  return randomBytes(32).toString("base64");
}

export function hmacSha256(value: string): string {
  return createHmac("sha256", getSearchHmacKey()).update(value, "utf8").digest("hex");
}
