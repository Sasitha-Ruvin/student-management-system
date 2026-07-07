import { prisma } from "@/lib/prisma";

export type RegistrationOptionRecord = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

function toRecord(row: {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): RegistrationOptionRecord {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listRegistrationSkinColors(
  activeOnly = false,
): Promise<RegistrationOptionRecord[]> {
  const rows = await prisma.registrationSkinColorOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function listRegistrationModelingInterests(
  activeOnly = false,
): Promise<RegistrationOptionRecord[]> {
  const rows = await prisma.registrationModelingInterestOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function listRegistrationEyeColors(
  activeOnly = false,
): Promise<RegistrationOptionRecord[]> {
  const rows = await prisma.registrationEyeColorOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function listRegistrationHairColors(
  activeOnly = false,
): Promise<RegistrationOptionRecord[]> {
  const rows = await prisma.registrationHairColorOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function getRegistrationSkinColorById(
  id: string,
): Promise<RegistrationOptionRecord | null> {
  const row = await prisma.registrationSkinColorOption.findUnique({
    where: { id },
  });
  return row ? toRecord(row) : null;
}

export async function getRegistrationModelingInterestById(
  id: string,
): Promise<RegistrationOptionRecord | null> {
  const row = await prisma.registrationModelingInterestOption.findUnique({
    where: { id },
  });
  return row ? toRecord(row) : null;
}

export async function getRegistrationEyeColorById(
  id: string,
): Promise<RegistrationOptionRecord | null> {
  const row = await prisma.registrationEyeColorOption.findUnique({
    where: { id },
  });
  return row ? toRecord(row) : null;
}

export async function getRegistrationHairColorById(
  id: string,
): Promise<RegistrationOptionRecord | null> {
  const row = await prisma.registrationHairColorOption.findUnique({
    where: { id },
  });
  return row ? toRecord(row) : null;
}

export async function resolveSkinColorOptionIdByLabel(
  label: string,
): Promise<string | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const row = await prisma.registrationSkinColorOption.findFirst({
    where: {
      label: { equals: trimmed, mode: "insensitive" },
      isActive: true,
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function resolveModelingInterestOptionIdsByLabels(
  labels: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const row = await prisma.registrationModelingInterestOption.findFirst({
      where: {
        label: { equals: trimmed, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true },
    });
    if (row) ids.push(row.id);
  }
  return [...new Set(ids)];
}
