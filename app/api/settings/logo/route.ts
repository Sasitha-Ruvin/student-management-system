import { NextResponse } from "next/server";

import { toAcademySettingsDto } from "@/lib/api/settings-mappers";
import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import { clearInvoiceLogoCache } from "@/lib/pdf/generate-invoice";
import {
  BRANDING_STORAGE_BUCKET,
  downloadBrandingLogo,
  extractBrandingLogoPath,
  LOGO_BASENAMES,
} from "@/lib/storage/branding";
import { validateRasterImageMagicBytes } from "@/lib/storage/image-magic-bytes";
import { createAdminClient } from "@/lib/supabase/admin";

const SETTINGS_ID = "default";
const BUCKET = BRANDING_STORAGE_BUCKET;
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/**
 * GET /api/settings/logo
 *
 * Streams the academy logo from Supabase Storage (bucket: branding).
 * Requires admin auth — works when the bucket is private.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { logoUrl: true },
  });

  if (!settings?.logoUrl) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  const downloaded = await downloadBrandingLogo(settings.logoUrl);
  if (!downloaded) {
    const path = extractBrandingLogoPath(settings.logoUrl);
    console.error(
      `[branding] Logo download failed for ${path ?? settings.logoUrl}`,
    );
    return NextResponse.json(
      {
        error: `Logo not found in storage bucket "${BRANDING_STORAGE_BUCKET}". Create the bucket in Supabase Storage if it does not exist.`,
      },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(downloaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": downloaded.mime,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  void admin;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File must be PNG, JPEG, or WebP" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be 2MB or smaller" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateRasterImageMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "File content does not match PNG, JPEG, or WebP" },
      { status: 400 },
    );
  }

  const ext = extFromMime(file.type);
  const path = `logo.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  let settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    settings = await prisma.academySettings.create({
      data: { id: SETTINGS_ID, logoUrl: path },
    });
  } else {
    settings = await prisma.academySettings.update({
      where: { id: SETTINGS_ID },
      data: { logoUrl: path },
    });
  }

  invalidateSettings();
  clearInvoiceLogoCache();

  return NextResponse.json({ data: toAcademySettingsDto(settings) });
}

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    return NextResponse.json(
      { error: "Settings not found" },
      { status: 404 },
    );
  }

  if (settings.logoUrl) {
    const supabase = createAdminClient();
    await supabase.storage.from(BUCKET).remove([...LOGO_BASENAMES]);
  }

  const updated = await prisma.academySettings.update({
    where: { id: SETTINGS_ID },
    data: { logoUrl: null },
  });

  invalidateSettings();
  clearInvoiceLogoCache();

  return NextResponse.json({ data: toAcademySettingsDto(updated) });
}
