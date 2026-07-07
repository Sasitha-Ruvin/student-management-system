const OLD_NIC_RE = /^[0-9]{9}[VvXx]$/;
const NEW_NIC_RE = /^[0-9]{12}$/;

export type NicValidationResult = {
  valid: boolean;
  normalised: string;
  error?: string;
};

/**
 * Validates a Sri Lankan NIC number.
 * Old format: 9 digits + V or X (case-insensitive), normalised to uppercase.
 * New format: 12 digits exactly.
 */
export function validateNic(raw: string): NicValidationResult {
  const trimmed = raw.trim();
  const normalised = trimmed.toUpperCase();

  if (OLD_NIC_RE.test(trimmed)) {
    return { valid: true, normalised };
  }

  if (NEW_NIC_RE.test(trimmed)) {
    return { valid: true, normalised };
  }

  return {
    valid: false,
    normalised,
    error:
      "NIC must be in old format (9 digits + V/X) or new format (12 digits)",
  };
}
