/** Minimum length for student portal passwords (create + admin set). */
export const PORTAL_PASSWORD_MIN_LENGTH = 8;

const CHARSET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";

export function generatePortalPassword(length = 12): string {
  const size = Math.max(PORTAL_PASSWORD_MIN_LENGTH, length);
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let password = "";
  for (let i = 0; i < size; i++) {
    password += CHARSET[bytes[i]! % CHARSET.length];
  }
  return password;
}

export function validatePortalPassword(password: string): string | null {
  if (!password || password.length < PORTAL_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PORTAL_PASSWORD_MIN_LENGTH} characters`;
  }
  return null;
}
