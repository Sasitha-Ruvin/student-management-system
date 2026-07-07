import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import {
  extractStudentPhotoPath,
  STUDENTS_STORAGE_BUCKET,
} from "@/lib/storage/photo";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/students/[id]/photo
 *
 * Streams the student's profile photo from Supabase Storage (bucket: students)
 * or proxies an external URL. Requires admin auth.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const student = await prisma.student.findUnique({
    where: { id },
    select: { photoUrl: true },
  });

  if (!student?.photoUrl) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const storagePath = extractStudentPhotoPath(student.photoUrl);

  if (storagePath) {
    const supabase = createAdminClient();
    const { data, error: downloadError } = await supabase.storage
      .from(STUDENTS_STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !data) {
      console.error(
        `[photo] Download failed for ${storagePath}:`,
        downloadError?.message,
      );
      return NextResponse.json(
        {
          error: `Photo not found in storage bucket "${STUDENTS_STORAGE_BUCKET}". Ensure the bucket exists and the file was uploaded.`,
        },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = storagePath.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // External URL (e.g. webhook registration) — proxy
  try {
    const res = await fetch(student.photoUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
}
