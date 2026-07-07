/**
 * Authenticated proxy URL for displaying a student's profile photo.
 * Works with public or private Supabase buckets (see GET /api/students/[id]/photo).
 */
export function studentPhotoSrc(
  studentId: string,
  photoUrl: string | null | undefined,
): string | null {
  if (!photoUrl) return null;
  return `/api/students/${studentId}/photo`;
}
