/**
 * Authenticated proxy URL for the academy logo in the admin UI.
 * Works with public or private Supabase buckets (see GET /api/settings/logo).
 */
export function settingsLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  return "/api/settings/logo";
}
