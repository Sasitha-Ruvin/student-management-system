import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "students";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  return "jpg";
}

/**
 * Uploads a registration fee receipt image to Supabase Storage.
 * Path: receipts/{enrollmentId}.{ext}
 * Throws on validation failure or upload error.
 */
export async function uploadReceiptFromFile(
  file: File,
  enrollmentId: string,
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw Object.assign(new Error("Receipt must be JPEG or PNG"), {
      statusCode: 400,
      field: "receipt",
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error("Receipt must be 5 MB or smaller"), {
      statusCode: 400,
      field: "receipt",
    });
  }

  const ext = extFromMime(file.type);
  const path = `receipts/${enrollmentId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Receipt upload failed: ${uploadError.message}`);
  }

  return path;
}
