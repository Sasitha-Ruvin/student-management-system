/** Prefer contact number; fall back to WhatsApp. */
export function resolveStudentPhone(
  contactNumber: string,
  whatsappNumber: string,
): string {
  const contact = contactNumber?.trim();
  if (contact) return contact;
  return whatsappNumber?.trim() ?? "";
}
