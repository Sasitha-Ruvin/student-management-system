import {
  getRegistrationEyeColorById,
  getRegistrationHairColorById,
  getRegistrationModelingInterestById,
  getRegistrationSkinColorById,
  listRegistrationEyeColors,
  listRegistrationHairColors,
  listRegistrationModelingInterests,
  listRegistrationSkinColors,
  type RegistrationOptionRecord,
} from "@/lib/registration/registration-option-queries";
import { prisma } from "@/lib/prisma";

export class RegistrationOptionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "RegistrationOptionError";
  }
}

export type OptionKind =
  | "skinColor"
  | "modelingInterest"
  | "eyeColor"
  | "hairColor";

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

async function countActiveDefaults(kind: OptionKind): Promise<number> {
  const where = { isActive: true, isDefault: true };
  switch (kind) {
    case "skinColor":
      return prisma.registrationSkinColorOption.count({ where });
    case "modelingInterest":
      return prisma.registrationModelingInterestOption.count({ where });
    case "eyeColor":
      return prisma.registrationEyeColorOption.count({ where });
    case "hairColor":
      return prisma.registrationHairColorOption.count({ where });
  }
}

async function createRow(
  kind: OptionKind,
  label: string,
  isActive: boolean,
): Promise<RegistrationOptionRecord> {
  const data = {
    label,
    isActive,
    isDefault: false,
  };

  switch (kind) {
    case "skinColor": {
      const count = await prisma.registrationSkinColorOption.count();
      const row = await prisma.registrationSkinColorOption.create({
        data: { ...data, sortOrder: count },
      });
      return toRecord(row);
    }
    case "modelingInterest": {
      const count = await prisma.registrationModelingInterestOption.count();
      const row = await prisma.registrationModelingInterestOption.create({
        data: { ...data, sortOrder: count },
      });
      return toRecord(row);
    }
    case "eyeColor": {
      const count = await prisma.registrationEyeColorOption.count();
      const row = await prisma.registrationEyeColorOption.create({
        data: { ...data, sortOrder: count },
      });
      return toRecord(row);
    }
    case "hairColor": {
      const count = await prisma.registrationHairColorOption.count();
      const row = await prisma.registrationHairColorOption.create({
        data: { ...data, sortOrder: count },
      });
      return toRecord(row);
    }
  }
}

async function getById(
  kind: OptionKind,
  id: string,
): Promise<RegistrationOptionRecord | null> {
  switch (kind) {
    case "skinColor":
      return getRegistrationSkinColorById(id);
    case "modelingInterest":
      return getRegistrationModelingInterestById(id);
    case "eyeColor":
      return getRegistrationEyeColorById(id);
    case "hairColor":
      return getRegistrationHairColorById(id);
  }
}

export async function createRegistrationOption(
  kind: OptionKind,
  input: { label: string; isActive?: boolean },
): Promise<RegistrationOptionRecord> {
  const label = input.label.trim();
  if (!label) throw new RegistrationOptionError("Label is required");
  return createRow(kind, label, input.isActive ?? true);
}

/** Adds a dropdown option when the user enters a custom eye/hair color at registration. */
export async function ensureRegistrationTextColorOption(
  kind: "eyeColor" | "hairColor",
  label: string,
): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;

  if (kind === "eyeColor") {
    const existing = await prisma.registrationEyeColorOption.findFirst({
      where: { label: { equals: trimmed, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return;

    const count = await prisma.registrationEyeColorOption.count();
    await prisma.registrationEyeColorOption.create({
      data: {
        label: trimmed,
        sortOrder: count,
        isActive: true,
        isDefault: false,
      },
    });
    return;
  }

  const existing = await prisma.registrationHairColorOption.findFirst({
    where: { label: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return;

  const count = await prisma.registrationHairColorOption.count();
  await prisma.registrationHairColorOption.create({
    data: {
      label: trimmed,
      sortOrder: count,
      isActive: true,
      isDefault: false,
    },
  });
}

export async function updateRegistrationOption(
  kind: OptionKind,
  id: string,
  input: { label?: string; isActive?: boolean; sortOrder?: number },
): Promise<RegistrationOptionRecord> {
  const existing = await getById(kind, id);

  if (!existing) {
    throw new RegistrationOptionError("Option not found", 404);
  }

  const label =
    input.label !== undefined ? input.label.trim() : existing.label;
  if (!label) throw new RegistrationOptionError("Label is required");

  if (input.isActive === false && existing.isDefault) {
    const activeDefaults = await countActiveDefaults(kind);
    if (activeDefaults <= 1 && existing.isActive) {
      throw new RegistrationOptionError(
        "Cannot deactivate the last active default option",
        422,
      );
    }
  }

  const data = {
    ...(input.label !== undefined ? { label } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
  };

  switch (kind) {
    case "skinColor": {
      const row = await prisma.registrationSkinColorOption.update({
        where: { id },
        data,
      });
      return toRecord(row);
    }
    case "modelingInterest": {
      const row = await prisma.registrationModelingInterestOption.update({
        where: { id },
        data,
      });
      return toRecord(row);
    }
    case "eyeColor": {
      const row = await prisma.registrationEyeColorOption.update({
        where: { id },
        data,
      });
      return toRecord(row);
    }
    case "hairColor": {
      const row = await prisma.registrationHairColorOption.update({
        where: { id },
        data,
      });
      return toRecord(row);
    }
  }
}

export async function deleteRegistrationOption(
  kind: OptionKind,
  id: string,
): Promise<void> {
  const existing = await getById(kind, id);

  if (!existing) {
    throw new RegistrationOptionError("Option not found", 404);
  }

  if (existing.isDefault) {
    throw new RegistrationOptionError(
      "Cannot delete a default option — deactivate it instead",
      422,
    );
  }

  switch (kind) {
    case "skinColor":
      await prisma.registrationSkinColorOption.delete({ where: { id } });
      return;
    case "modelingInterest":
      await prisma.registrationModelingInterestOption.delete({ where: { id } });
      return;
    case "eyeColor":
      await prisma.registrationEyeColorOption.delete({ where: { id } });
      return;
    case "hairColor":
      await prisma.registrationHairColorOption.delete({ where: { id } });
      return;
  }
}

export {
  listRegistrationEyeColors,
  listRegistrationHairColors,
  listRegistrationModelingInterests,
  listRegistrationSkinColors,
};
