/**
 * Public logo URL for login + sidebar. Always proxied so private Supabase
 * buckets work and unauthenticated login can load the image.
 */
export function brandingLogoSrc(
  logoUrl: string | null | undefined,
  cacheKey?: string,
): string | null {
  if (!logoUrl) return null;
  const v = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : "";
  return `/api/branding/logo${v}`;
}
