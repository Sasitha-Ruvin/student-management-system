import { createInvoiceDownloadToken } from "@/lib/invoices/invoice-download-token";

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "");
}

/** Resolve public admin portal origin for links embedded in SMS. */
export function resolveAdminPortalBaseUrl(request?: Request): string {
  const fromEnv =
    process.env.ADMIN_PORTAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : "");

  if (fromEnv) {
    return normalizeBaseUrl(fromEnv);
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host")?.trim();
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
        (host.includes("localhost") ? "http" : "https");
      return normalizeBaseUrl(`${proto}://${host}`);
    }
  }

  throw new Error(
    "Set ADMIN_PORTAL_URL or NEXT_PUBLIC_SITE_URL for public invoice download links",
  );
}

/** Signed app URL for invoice PDF download — no login required. */
export function createPublicInvoiceDownloadUrl(
  invoiceId: string,
  request?: Request,
): string {
  const token = createInvoiceDownloadToken(invoiceId);
  const base = resolveAdminPortalBaseUrl(request);
  return `${base}/api/invoices/download?token=${encodeURIComponent(token)}`;
}
