import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "invoices";

/**
 * Extracts the object path inside the invoices bucket from a stored URL or path.
 * e.g. "invoices/{invoiceId}.pdf"
 */
export function extractInvoicePdfPath(storedPdfUrl: string): string | null {
  if (!storedPdfUrl.includes("://")) {
    return storedPdfUrl.replace(/^\//, "");
  }

  try {
    const url = new URL(storedPdfUrl);
    const fromPublic = url.pathname.match(
      /\/storage\/v1\/object\/public\/invoices\/(.+)$/,
    );
    if (fromPublic?.[1]) return decodeURIComponent(fromPublic[1]);

    const fromSign = url.pathname.match(
      /\/storage\/v1\/object\/sign\/invoices\/(.+)$/,
    );
    if (fromSign?.[1]) {
      return decodeURIComponent(fromSign[1].split("?")[0] ?? fromSign[1]);
    }

    const legacy = url.pathname.match(/\/invoices\/(.+)$/);
    if (legacy?.[1]) return decodeURIComponent(legacy[1]);

    return null;
  } catch {
    return null;
  }
}

function invoiceStoragePath(invoiceId: string): string {
  return `invoices/${invoiceId}.pdf`;
}

/**
 * Uploads an invoice PDF to Supabase Storage and returns the storage path.
 */
export async function uploadInvoicePdf(
  invoiceId: string,
  buffer: Buffer,
): Promise<string> {
  const path = invoiceStoragePath(invoiceId);
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Invoice PDF upload failed: ${uploadError.message}`);
  }

  return path;
}

/**
 * Downloads a cached invoice PDF from storage, if present.
 */
export async function downloadInvoicePdf(
  invoiceId: string,
): Promise<Buffer | null> {
  const path = invoiceStoragePath(invoiceId);
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;

  return Buffer.from(await data.arrayBuffer());
}

/** Time-limited download link for SMS (default 7 days). */
export async function createInvoicePdfSignedUrl(
  invoiceId: string,
  expiresInSeconds = 7 * 24 * 60 * 60,
): Promise<string | null> {
  const path = invoiceStoragePath(invoiceId);
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
