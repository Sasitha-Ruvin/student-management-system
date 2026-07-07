import { createAdminClient } from "@/lib/supabase/admin";

import { validateRasterImageMagicBytes } from "@/lib/storage/image-magic-bytes";

/** Private bucket for NIC and professional photos. */
export const STUDENT_DOCUMENTS_BUCKET = "student-documents";

const BUCKET = STUDENT_DOCUMENTS_BUCKET;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REMOTE_DOCUMENT_SIZE = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);

function extFromMime(mime: string): string {
  return mime.includes("png") ? "png" : "jpg";
}

export function validateStudentDocumentFile(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw Object.assign(new Error("File must be JPEG or PNG"), {
      statusCode: 400,
    });
  }
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error("File must be 5 MB or smaller"), {
      statusCode: 400,
    });
  }
}

export async function validateStudentDocumentBuffer(
  buffer: Buffer,
  mime: string,
): Promise<void> {
  if (!ALLOWED_MIME.has(mime)) {
    throw Object.assign(new Error("File must be JPEG or PNG"), {
      statusCode: 400,
    });
  }
  if (!validateRasterImageMagicBytes(buffer, mime)) {
    throw Object.assign(new Error("File content does not match JPEG or PNG"), {
      statusCode: 400,
    });
  }
}

export async function uploadStudentDocument(
  studentId: string,
  kind: "nic-front" | "nic-back" | "professional",
  file: File,
  sortOrder = 0,
): Promise<{ storagePath: string; mimeType: string }> {
  validateStudentDocumentFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  await validateStudentDocumentBuffer(buffer, file.type);

  const ext = extFromMime(file.type);
  let path: string;
  if (kind === "professional") {
    path = `documents/${studentId}/professional/${sortOrder}.${ext}`;
  } else {
    path = `documents/${studentId}/${kind}.${ext}`;
  }

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Document upload failed: ${uploadError.message}`);
  }

  return { storagePath: path, mimeType: file.type };
}

export async function uploadStudentDocumentFromBuffer(
  studentId: string,
  kind: "nic-front" | "nic-back" | "professional",
  buffer: Buffer,
  mime: string,
  sortOrder = 0,
): Promise<{ storagePath: string; mimeType: string }> {
  await validateStudentDocumentBuffer(buffer, mime);

  const ext = extFromMime(mime);
  let path: string;
  if (kind === "professional") {
    path = `documents/${studentId}/professional/${sortOrder}.${ext}`;
  } else {
    path = `documents/${studentId}/${kind}.${ext}`;
  }

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Document upload failed: ${uploadError.message}`);
  }

  return { storagePath: path, mimeType: mime };
}

function normaliseFetchedContentType(header: string | null): string | null {
  if (!header) return null;
  const base = header.split(";")[0].trim().toLowerCase();
  return base === "image/jpg" ? "image/jpeg" : base;
}

/**
 * Downloads a remote document URL (JPEG or PNG only, magic bytes enforced) into
 * student-documents. Does not throw — returns null on validation or network failures.
 */
export async function uploadStudentDocumentFromUrl(
  studentId: string,
  kind: "nic-front" | "nic-back" | "professional",
  url: string,
  sortOrder = 0,
): Promise<{ storagePath: string; mimeType: string } | null> {
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

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_REMOTE_DOCUMENT_SIZE) {
      return null;
    }

    const mime = normaliseFetchedContentType(response.headers.get("content-type"));
    if (!mime || !ALLOWED_MIME.has(mime)) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_DOCUMENT_SIZE) return null;

    return await uploadStudentDocumentFromBuffer(studentId, kind, buffer, mime, sortOrder);
  } catch (err) {
    console.warn(
      `[student-documents] uploadStudentDocumentFromUrl failed for student ${studentId}:`,
      err,
    );
    return null;
  }
}

export async function downloadStudentDocument(
  storagePath: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const path = normaliseDocumentStoragePath(storagePath);
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  const ext = path.split(".").pop()?.toLowerCase();
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  return { buffer, mimeType };
}

/** Strips bucket prefixes and leading slashes from stored paths. */
export function normaliseDocumentStoragePath(storagePath: string): string {
  let path = storagePath.trim();
  if (path.startsWith(`${BUCKET}/`)) {
    path = path.slice(BUCKET.length + 1);
  }
  return path.replace(/^\/+/, "");
}
