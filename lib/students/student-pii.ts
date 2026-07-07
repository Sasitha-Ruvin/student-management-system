import type { Prisma } from "@/app/generated/prisma";
import {
  decryptFieldSafe,
  decryptOptionalSafe,
  encryptField,
  encryptOptional,
  hashNicExact,
  hashNicSearchQuery,
  hashNicTrigram,
  maskNic,
} from "@/lib/pii-crypto";
import { buildNicTrigrams } from "@/lib/pii-crypto/nic-search";
import {
  buildNameSearchTokens,
  hashNameSearchQuery,
  hashNameToken,
} from "@/lib/pii-crypto/name-search";
import { maskPhone, REDACTED } from "@/lib/pii-crypto/masks";

export const STUDENT_PII_SELECT = {
  fullName: true,
  email: true,
  gender: true,
  nicEnc: true,
  nicHash: true,
  dobEnc: true,
  addressEnc: true,
  contactNumberEnc: true,
  whatsappNumberEnc: true,
  heightEnc: true,
  weightEnc: true,
  chestEnc: true,
  shoulderEnc: true,
  waistEnc: true,
  shoeSizeEnc: true,
  skinColorOptionId: true,
  eyeColorEnc: true,
  hairColorEnc: true,
  talentsEnc: true,
  loginDisabledNote: true,
  preferredBranchRaw: true,
  preferredDate: true,
  fcmToken: true,
} as const;

export type StudentPiiDbRow = {
  fullName: string;
  email: string;
  gender: string;
  nicEnc: string;
  nicHash: string;
  dobEnc: string;
  addressEnc: string;
  contactNumberEnc: string;
  whatsappNumberEnc: string;
  heightEnc: string | null;
  weightEnc: string | null;
  chestEnc: string | null;
  shoulderEnc: string | null;
  waistEnc: string | null;
  shoeSizeEnc: string | null;
  skinColorOptionId: string | null;
  eyeColorEnc: string | null;
  hairColorEnc: string | null;
  talentsEnc: string | null;
  loginDisabledNote: string | null;
  preferredBranchRaw: string | null;
  preferredDate: string | null;
  fcmToken: string | null;
};

export type StudentPiiPlain = {
  email: string;
  fullName: string;
  gender: string;
  nic: string;
  dob: Date;
  address: string;
  contactNumber: string;
  whatsappNumber: string;
  height: number | null;
  weight: number | null;
  chest: number | null;
  shoulder: number | null;
  waist: number | null;
  shoeSize: string | null;
  skinColorOptionId: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  talents: string | null;
  loginDisabledNote: string | null;
  preferredBranchRaw: string | null;
  preferredDate: string | null;
  fcmToken: string | null;
};

export type EncryptStudentPiiInput = {
  email: string;
  fullName: string;
  gender: string;
  nic: string;
  dob: Date;
  address?: string;
  contactNumber: string;
  whatsappNumber: string;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  shoulder?: number | null;
  waist?: number | null;
  shoeSize?: string | null;
  skinColorOptionId?: string | null;
  eyeColor?: string | null;
  hairColor?: string | null;
  talents?: string | null;
  loginDisabledNote?: string | null;
  preferredBranchRaw?: string | null;
  preferredDate?: string | null;
  fcmToken?: string | null;
};

export type StudentPiiPlainWithMeta = StudentPiiPlain & {
  /** True when encrypted fields could not be decrypted (usually key rotation). */
  piiDecryptFailed: boolean;
};

export function decryptStudentPii(row: StudentPiiDbRow): StudentPiiPlain {
  const result = decryptStudentPiiSafe(row);
  if (result.piiDecryptFailed) {
    throw new Error(
      "Unable to decrypt student PII — DATA_ENCRYPTION_KEY may have changed",
    );
  }
  const { piiDecryptFailed: _, ...pii } = result;
  return pii;
}

/**
 * Decrypts student PII without throwing. Plaintext columns (name, email) still
 * return; encrypted fields show REDACTED when the current key cannot decrypt
 * (e.g. after key rotation).
 */
export function decryptStudentPiiSafe(
  row: StudentPiiDbRow,
): StudentPiiPlainWithMeta {
  const email = row.email.trim().toLowerCase();
  const fullName = row.fullName.trim();
  const gender = row.gender.trim();

  if (!email) throw new Error("Student record is missing email");
  if (!fullName) throw new Error("Student record is missing full name");
  if (!gender) throw new Error("Student record is missing gender");

  const nicRaw = decryptFieldSafe(row.nicEnc);
  const dobRaw = decryptFieldSafe(row.dobEnc);
  const addressRaw = decryptFieldSafe(row.addressEnc);
  const contactRaw = decryptFieldSafe(row.contactNumberEnc);
  const whatsappRaw = decryptFieldSafe(row.whatsappNumberEnc);

  const piiDecryptFailed =
    nicRaw == null ||
    dobRaw == null ||
    addressRaw == null ||
    contactRaw == null ||
    whatsappRaw == null;

  const dob =
    dobRaw != null && !Number.isNaN(new Date(dobRaw).getTime())
      ? new Date(dobRaw)
      : new Date(0);

  const heightRaw = decryptOptionalSafe(row.heightEnc);
  const weightRaw = decryptOptionalSafe(row.weightEnc);
  const chestRaw = decryptOptionalSafe(row.chestEnc);
  const shoulderRaw = decryptOptionalSafe(row.shoulderEnc);
  const waistRaw = decryptOptionalSafe(row.waistEnc);

  return {
    email,
    fullName,
    gender,
    nic: nicRaw?.trim() || REDACTED,
    dob,
    address: addressRaw?.trim() || REDACTED,
    contactNumber: contactRaw?.trim() || REDACTED,
    whatsappNumber: whatsappRaw?.trim() || REDACTED,
    height: heightRaw != null ? Number(heightRaw) : null,
    weight: weightRaw != null ? Number(weightRaw) : null,
    chest: chestRaw != null ? Number(chestRaw) : null,
    shoulder: shoulderRaw != null ? Number(shoulderRaw) : null,
    waist: waistRaw != null ? Number(waistRaw) : null,
    shoeSize: decryptOptionalSafe(row.shoeSizeEnc),
    skinColorOptionId: row.skinColorOptionId,
    eyeColor: decryptOptionalSafe(row.eyeColorEnc),
    hairColor: decryptOptionalSafe(row.hairColorEnc),
    talents: decryptOptionalSafe(row.talentsEnc),
    loginDisabledNote: row.loginDisabledNote,
    preferredBranchRaw: row.preferredBranchRaw,
    preferredDate: row.preferredDate,
    fcmToken: row.fcmToken,
    piiDecryptFailed,
  };
}

export type EncryptedStudentFields = {
  fullName: string;
  email: string;
  gender: string;
  nicEnc: string;
  nicHash: string;
  dobEnc: string;
  addressEnc: string;
  contactNumberEnc: string;
  whatsappNumberEnc: string;
  heightEnc: string | null;
  weightEnc: string | null;
  chestEnc: string | null;
  shoulderEnc: string | null;
  waistEnc: string | null;
  shoeSizeEnc: string | null;
  skinColorOptionId: string | null;
  eyeColorEnc: string | null;
  hairColorEnc: string | null;
  talentsEnc: string | null;
  loginDisabledNote: string | null;
  preferredBranchRaw: string | null;
  preferredDate: string | null;
  fcmToken: string | null;
};

export function encryptStudentPiiForWrite(
  input: EncryptStudentPiiInput,
): EncryptedStudentFields {
  const normalizedNic = input.nic.trim().toUpperCase();
  const dobIso = input.dob.toISOString().split("T")[0]!;

  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    gender: input.gender.trim(),
    // encryptOptional returns string | null but these are guaranteed non-null for valid inputs
    nicEnc: encryptOptional(normalizedNic) as string,
    nicHash: hashNicExact(normalizedNic),
    dobEnc: encryptOptional(dobIso) as string,
    // DB column is non-null; store encrypted empty string when address omitted.
    addressEnc: encryptField((input.address ?? "").trim()),
    contactNumberEnc: encryptOptional(input.contactNumber.trim()) as string,
    whatsappNumberEnc: encryptOptional(input.whatsappNumber.trim()) as string,
    heightEnc:
      input.height != null ? encryptOptional(String(input.height)) : null,
    weightEnc:
      input.weight != null ? encryptOptional(String(input.weight)) : null,
    chestEnc:
      input.chest != null ? encryptOptional(String(input.chest)) : null,
    shoulderEnc:
      input.shoulder != null ? encryptOptional(String(input.shoulder)) : null,
    waistEnc:
      input.waist != null ? encryptOptional(String(input.waist)) : null,
    shoeSizeEnc:
      input.shoeSize != null ? encryptOptional(input.shoeSize.trim()) : null,
    skinColorOptionId: input.skinColorOptionId?.trim() || null,
    eyeColorEnc:
      input.eyeColor != null ? encryptOptional(input.eyeColor.trim()) : null,
    hairColorEnc:
      input.hairColor != null ? encryptOptional(input.hairColor.trim()) : null,
    talentsEnc:
      input.talents != null ? encryptOptional(input.talents.trim()) : null,
    loginDisabledNote: input.loginDisabledNote?.trim() || null,
    preferredBranchRaw: input.preferredBranchRaw?.trim() || null,
    preferredDate: input.preferredDate?.trim() || null,
    fcmToken: input.fcmToken?.trim() || null,
  };
}

export function emailDuplicateWhere(email: string): Prisma.StudentWhereInput {
  return { email: email.trim().toLowerCase() };
}

export function nicDuplicateWhere(
  normalizedNic: string,
): Prisma.StudentWhereInput {
  return { nicHash: hashNicExact(normalizedNic.trim().toUpperCase()) };
}

export function buildStudentTextSearchWhere(
  search: string,
): Prisma.StudentWhereInput[] {
  const s = search.trim();
  const clauses: Prisma.StudentWhereInput[] = [
    { modelCode: { contains: s, mode: "insensitive" } },
    { email: { contains: s, mode: "insensitive" } },
    { fullName: { contains: s, mode: "insensitive" } },
  ];

  const upper = s.toUpperCase();
  clauses.push({ nicHash: hashNicExact(upper) });

  const nicHashes = hashNicSearchQuery(s);
  if (nicHashes.length > 0) {
    clauses.push({
      nicSearchTokens: { some: { tokenHash: { in: nicHashes } } },
    });
  }

  const nameHashes = hashNameSearchQuery(s);
  if (nameHashes.length > 0) {
    clauses.push({
      nameSearchTokens: { some: { tokenHash: { in: nameHashes } } },
    });
  }

  return clauses;
}

export async function syncNicSearchTokens(
  tx: Prisma.TransactionClient,
  studentId: string,
  normalizedNic: string,
): Promise<void> {
  const trigrams = buildNicTrigrams(normalizedNic.trim().toUpperCase());
  const tokenHashes = [...new Set(trigrams.map(hashNicTrigram))];

  await tx.studentNicSearchToken.deleteMany({ where: { studentId } });

  if (tokenHashes.length === 0) return;

  await tx.studentNicSearchToken.createMany({
    data: tokenHashes.map((tokenHash) => ({ studentId, tokenHash })),
    skipDuplicates: true,
  });
}

export async function syncNameSearchTokens(
  tx: Prisma.TransactionClient,
  studentId: string,
  fullName: string,
): Promise<void> {
  const tokens = buildNameSearchTokens(fullName);
  const tokenHashes = [...new Set(tokens.map(hashNameToken))];

  await tx.studentNameSearchToken.deleteMany({ where: { studentId } });

  if (tokenHashes.length === 0) return;

  await tx.studentNameSearchToken.createMany({
    data: tokenHashes.map((tokenHash) => ({ studentId, tokenHash })),
    skipDuplicates: true,
  });
}

export async function syncStudentSearchTokens(
  tx: Prisma.TransactionClient,
  studentId: string,
  fullName: string,
  normalizedNic: string,
): Promise<void> {
  await Promise.all([
    syncNicSearchTokens(tx, studentId, normalizedNic),
    syncNameSearchTokens(tx, studentId, fullName),
  ]);
}

export function studentDisplayFields(
  row: { id: string; modelCode: string; fullName: string },
): { id: string; modelCode: string; fullName: string } {
  return {
    id: row.id,
    modelCode: row.modelCode,
    fullName: row.fullName,
  };
}

export function maskStudentNic(row: StudentPiiDbRow): string {
  const pii = decryptStudentPiiSafe(row);
  if (pii.piiDecryptFailed) return "Unavailable";
  return maskNic(pii.nic);
}

export function maskStudentPhones(row: StudentPiiDbRow): {
  contactNumber: string;
  whatsappNumber: string;
} {
  const pii = decryptStudentPiiSafe(row);
  if (pii.piiDecryptFailed) {
    return { contactNumber: "Unavailable", whatsappNumber: "Unavailable" };
  }
  return {
    contactNumber: maskPhone(pii.contactNumber),
    whatsappNumber: maskPhone(pii.whatsappNumber),
  };
}
