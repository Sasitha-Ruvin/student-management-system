/** Authenticated proxy paths — never expose Supabase storage URLs to clients. */

export function studentPhotoProxyUrl(
  studentId: string,
  storedPhotoUrl: string | null | undefined,
): string | null {
  if (!storedPhotoUrl?.trim()) return null;
  return `/api/students/${studentId}/photo`;
}

export function invoicePdfProxyUrl(
  paymentId: string,
  storedPdfUrl: string | null | undefined,
): string | null {
  if (!storedPdfUrl?.trim()) return null;
  return `/api/payments/${paymentId}/invoice`;
}

export function academyLogoProxyUrl(
  storedLogoUrl: string | null | undefined,
): string | null {
  if (!storedLogoUrl?.trim()) return null;
  return "/api/settings/logo";
}

export function studentPortalPhotoProxyUrl(
  storedPhotoUrl: string | null | undefined,
): string | null {
  if (!storedPhotoUrl?.trim()) return null;
  return "/api/auth/photo";
}

export function studentDocumentProxyUrl(
  studentId: string,
  documentId: string,
): string {
  return `/api/students/${studentId}/documents/${documentId}`;
}

export function studentPortalDocumentProxyUrl(documentId: string): string {
  return `/api/documents/${documentId}`;
}
