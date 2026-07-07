import { createAdminClient } from "@/lib/supabase/admin";

import { fetchImageBuffer } from "@/lib/pdf/fetch-image";

/** Supabase Storage bucket for academy branding assets (logo). */
export const BRANDING_STORAGE_BUCKET = "branding";

const LOGO_BASENAMES = ["logo.png", "logo.jpg", "logo.webp"] as const;

function mimeFromPath(storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return "image/jpeg";
}

export function isSvgStoragePath(storagePath: string): boolean {
  return storagePath.split(".").pop()?.toLowerCase() === "svg";
}

/**
 * Extracts the object path inside the branding bucket from a stored URL or path.
 * e.g. "logo.png"
 */
export function extractBrandingLogoPath(logoUrl: string): string | null {
  if (!logoUrl.includes("://")) {
    return logoUrl.replace(/^\//, "");
  }

  try {
    const url = new URL(logoUrl);
    const fromPublic = url.pathname.match(
      /\/storage\/v1\/object\/public\/branding\/(.+)$/,
    );
    if (fromPublic?.[1]) return decodeURIComponent(fromPublic[1]);

    const fromSign = url.pathname.match(
      /\/storage\/v1\/object\/sign\/branding\/(.+)$/,
    );
    if (fromSign?.[1]) {
      return decodeURIComponent(fromSign[1].split("?")[0] ?? fromSign[1]);
    }

    const legacy = url.pathname.match(/\/branding\/(.+)$/);
    if (legacy?.[1]) return decodeURIComponent(legacy[1]);

    return null;
  } catch {
    return null;
  }
}

/**
 * Downloads the academy logo from Supabase Storage or an external URL.
 */
export async function downloadBrandingLogo(
  logoUrl: string | null,
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!logoUrl) return null;

  const storagePath = extractBrandingLogoPath(logoUrl);
  if (storagePath) {
    if (isSvgStoragePath(storagePath)) {
      return null;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(BRANDING_STORAGE_BUCKET)
      .download(storagePath);

    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      return { buffer, mime: mimeFromPath(storagePath) };
    }
  }

  return fetchImageBuffer(logoUrl);
}

export { LOGO_BASENAMES };
