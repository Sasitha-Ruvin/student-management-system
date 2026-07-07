import { hmacSha256 } from "@/lib/pii-crypto/keys";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmailExact(email: string): string {
  return hmacSha256(`email:exact:${normalizeEmail(email)}`);
}
