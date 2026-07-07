/** Random 4-digit attendance PIN (0000–9999). */
export function generateSessionPin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const value = bytes[0]! % 10000;
  return String(value).padStart(4, "0");
}
