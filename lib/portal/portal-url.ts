/** Login page URL for the student portal (used in credential emails/SMS). */
export function getStudentPortalLoginUrl(): string {
  const raw =
    process.env.STUDENT_PORTAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  if (!raw) return "/login";

  const base = raw.replace(/\/$/, "");
  if (base.endsWith("/login")) return base;
  return `${base}/login`;
}
