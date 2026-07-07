import type { StudentDocumentType } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  normaliseDocumentStoragePath,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/storage/student-documents";

type DiscoveredDoc = {
  type: StudentDocumentType;
  storagePath: string;
  mimeType: string;
  sortOrder: number;
};

function mimeFromFilename(name: string): string {
  return name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
}

/** Folder id used at upload time — may differ from student id when registrationId was used. */
export function resolveStudentStorageFolderId(
  studentId: string,
  photoUrl: string | null | undefined,
): string {
  const raw = photoUrl?.trim();
  if (raw) {
    const path = normaliseDocumentStoragePath(raw);
    const fromPhotos = path.match(/^photos\/([^./]+)\./);
    if (fromPhotos?.[1]) return fromPhotos[1];
  }
  return studentId;
}

async function discoverDocumentsInStorage(
  folderId: string,
): Promise<DiscoveredDoc[]> {
  const supabase = createAdminClient();
  const base = `documents/${folderId}`;
  const discovered: DiscoveredDoc[] = [];

  const { data: rootFiles, error: rootError } = await supabase.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .list(base);

  if (rootError || !rootFiles) return discovered;

  for (const file of rootFiles) {
    if (!file.name || file.name === "professional") continue;
    const lower = file.name.toLowerCase();
    const fullPath = `${base}/${file.name}`;

    if (lower.startsWith("nic-front.")) {
      discovered.push({
        type: "NIC_FRONT",
        storagePath: fullPath,
        mimeType: mimeFromFilename(file.name),
        sortOrder: 0,
      });
    } else if (lower.startsWith("nic-back.")) {
      discovered.push({
        type: "NIC_BACK",
        storagePath: fullPath,
        mimeType: mimeFromFilename(file.name),
        sortOrder: 0,
      });
    }
  }

  const { data: proFiles, error: proError } = await supabase.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .list(`${base}/professional`);

  if (!proError && proFiles) {
    for (const file of proFiles) {
      if (!file.name) continue;
      const match = file.name.match(/^(\d+)\.(jpe?g|png)$/i);
      if (!match) continue;
      discovered.push({
        type: "PROFESSIONAL_PHOTO",
        storagePath: `${base}/professional/${file.name}`,
        mimeType: mimeFromFilename(file.name),
        sortOrder: Number(match[1]),
      });
    }
  }

  return discovered;
}

/**
 * Creates student_documents rows for files already in storage but missing from DB
 * (e.g. website registration uploaded files but omitted path fields).
 */
export async function syncStudentDocumentsFromStorage(
  studentId: string,
  photoUrl?: string | null,
): Promise<number> {
  const folderId = resolveStudentStorageFolderId(studentId, photoUrl);
  const folderIds = folderId === studentId ? [studentId] : [studentId, folderId];

  const discoveredMap = new Map<string, DiscoveredDoc>();
  for (const id of folderIds) {
    for (const doc of await discoverDocumentsInStorage(id)) {
      discoveredMap.set(doc.storagePath, doc);
    }
  }
  const discovered = [...discoveredMap.values()];
  if (discovered.length === 0) return 0;

  const existing = await prisma.studentDocument.findMany({
    where: { studentId },
    select: { type: true, storagePath: true, sortOrder: true },
  });

  const existingPaths = new Set(
    existing.map((d) => normaliseDocumentStoragePath(d.storagePath)),
  );
  const existingKeys = new Set(
    existing.map((d) =>
      d.type === "PROFESSIONAL_PHOTO"
        ? `${d.type}:${d.sortOrder}`
        : d.type,
    ),
  );

  const toCreate = discovered.filter((doc) => {
    const path = normaliseDocumentStoragePath(doc.storagePath);
    if (existingPaths.has(path)) return false;
    const key =
      doc.type === "PROFESSIONAL_PHOTO"
        ? `${doc.type}:${doc.sortOrder}`
        : doc.type;
    if (existingKeys.has(key)) return false;
    return true;
  });

  if (toCreate.length === 0) return 0;

  await prisma.studentDocument.createMany({
    data: toCreate.map((doc) => ({
      studentId,
      type: doc.type,
      storagePath: normaliseDocumentStoragePath(doc.storagePath),
      mimeType: doc.mimeType,
      sortOrder: doc.sortOrder,
    })),
  });

  return toCreate.length;
}
