import { createAdminClient } from "@/lib/supabase/admin";

/** Supabase Storage bucket for student profile photos and registration receipts. */
export const STUDENTS_STORAGE_BUCKET = "students";

const BUCKET = STUDENTS_STORAGE_BUCKET;
const MAX_REMOTE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;    // 5MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Extracts the object path inside the students bucket from a stored public/signed URL.
 * e.g. "photos/{studentId}.jpg"
 */
export function extractStudentPhotoPath(photoUrl: string): string | null {
  if (!photoUrl.includes("://")) {
    return photoUrl.replace(/^\//, "");
  }

  try {
    const url = new URL(photoUrl);
    const fromPublic = url.pathname.match(
      /\/storage\/v1\/object\/public\/students\/(.+)$/,
    );
    if (fromPublic?.[1]) return decodeURIComponent(fromPublic[1]);

    const fromSign = url.pathname.match(
      /\/storage\/v1\/object\/sign\/students\/(.+)$/,
    );
    if (fromSign?.[1]) {
      return decodeURIComponent(fromSign[1].split("?")[0] ?? fromSign[1]);
    }

    const legacy = url.pathname.match(/\/students\/(.+)$/);
    if (legacy?.[1]) return decodeURIComponent(legacy[1]);

    return null;
  } catch {
    return null;
  }
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Downloads an external photo URL and uploads it to Supabase Storage.
 * Never throws — returns null on any failure (timeout, bad content-type, etc).
 */
export async function uploadPhotoFromUrl(
  url: string,
  studentId: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return null;

    // Check content-length before downloading
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REMOTE_SIZE) {
      console.warn(`[photo] Skipping oversized photo for student ${studentId}`);
      return null;
    }

    // Verify content-type
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`[photo] Non-image content-type "${contentType}" for student ${studentId}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Double-check size after download
    if (buffer.length > MAX_REMOTE_SIZE) {
      console.warn(`[photo] Downloaded file exceeds 10MB for student ${studentId}`);
      return null;
    }

    const ext = extFromMime(contentType);
    const path = `photos/${studentId}.${ext}`;
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[photo] Upload error for student ${studentId}:`, uploadError.message);
      return null;
    }

    return path;
  } catch (err) {
    console.warn(`[photo] Failed to upload photo for student ${studentId}:`, err);
    return null;
  }
}

/**
 * Uploads a photo File to Supabase Storage.
 * Throws with a structured error object on validation failure.
 */
export async function uploadPhotoFromFile(
  file: File,
  studentId: string,
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw Object.assign(new Error("Photo must be JPEG or PNG"), {
      statusCode: 400,
      field: "photo",
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error("Photo must be 5MB or smaller"), {
      statusCode: 400,
      field: "photo",
    });
  }

  const ext = extFromMime(file.type);
  const path = `photos/${studentId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  return path;
}
