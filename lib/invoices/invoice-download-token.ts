import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

function getSecret(): string {
  const secret =
    process.env.INVOICE_DOWNLOAD_SECRET?.trim() ||
    process.env.SEARCH_HMAC_KEY?.trim() ||
    process.env.DATA_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error(
      "Set INVOICE_DOWNLOAD_SECRET (or SEARCH_HMAC_KEY) for receipt download links",
    );
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Opaque token for public invoice PDF download (no Supabase JWT). */
export function createInvoiceDownloadToken(
  invoiceId: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${invoiceId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyInvoiceDownloadToken(
  token: string,
): { invoiceId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [invoiceId, expStr, sig] = parts;
  if (!invoiceId || !expStr || !sig) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const payload = `${invoiceId}.${expStr}`;
  const expected = sign(payload);

  try {
    const got = Buffer.from(sig);
    const want = Buffer.from(expected);
    if (got.length !== want.length || !timingSafeEqual(got, want)) {
      return null;
    }
  } catch {
    return null;
  }

  return { invoiceId };
}
