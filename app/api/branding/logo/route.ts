import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  BRANDING_STORAGE_BUCKET,
  downloadBrandingLogo,
  extractBrandingLogoPath,
  isSvgStoragePath,
  LOGO_BASENAMES,
} from "@/lib/storage/branding";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_ID = "default";

function mimeFromPath(storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function downloadByBasenames(): Promise<{
  buffer: Buffer;
  mime: string;
} | null> {
  const supabase = createAdminClient();
  for (const name of LOGO_BASENAMES) {
    if (isSvgStoragePath(name)) continue;

    const { data, error } = await supabase.storage
      .from(BRANDING_STORAGE_BUCKET)
      .download(name);
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      return { buffer, mime: mimeFromPath(name) };
    }
  }
  return null;
}

/**
 * GET /api/branding/logo
 *
 * Public logo stream for login and sidebar (no admin session required).
 */
export async function GET() {
  const settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { logoUrl: true },
  });

  if (settings?.logoUrl) {
    const path = extractBrandingLogoPath(settings.logoUrl);
    if (path && isSvgStoragePath(path)) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }
  }

  if (!settings?.logoUrl) {
    const fallback = await downloadByBasenames();
    if (!fallback) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(fallback.buffer), {
      status: 200,
      headers: {
        "Content-Type": fallback.mime,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  }

  let downloaded = await downloadBrandingLogo(settings.logoUrl);

  if (!downloaded) {
    const path = extractBrandingLogoPath(settings.logoUrl);
    console.error(
      `[branding] Logo download failed for ${path ?? settings.logoUrl}, trying basenames`,
    );
    downloaded = await downloadByBasenames();
  }

  if (!downloaded) {
    return NextResponse.json(
      {
        error: `Logo not found in storage bucket "${BRANDING_STORAGE_BUCKET}".`,
      },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(downloaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": downloaded.mime,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
