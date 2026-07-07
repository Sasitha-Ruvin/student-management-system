import type { Prisma, PrismaClient } from "@/app/generated/prisma";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  emailDuplicateWhere,
  encryptStudentPiiForWrite,
  nicDuplicateWhere,
  syncStudentSearchTokens,
} from "@/lib/students/student-pii";

export type DuplicateField = "modelCode" | "email" | "nic";

export class DuplicateStudentError extends Error {
  constructor(
    public readonly field: DuplicateField,
    public readonly existingStudentId?: string,
  ) {
    super(`Student with this ${field} already exists`);
    this.name = "DuplicateStudentError";
  }
}

export type CreateStudentData = {
  modelCode: string;
  source: "WEBHOOK" | "WEBSITE" | "MANUAL";
  fullName: string;
  email: string;
  nic: string;
  dob: Date;
  age: number;
  gender: string;
  contactNumber: string;
  whatsappNumber: string;
  address: string;
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
  modelingInterestIds?: string[];
  photoUrl?: string | null;
  preferredBranchId?: string | null;
  preferredBranchRaw?: string | null;
  preferredDate?: string | null;
};

/**
 * Creates a Student record and an initial UNASSIGNED Enrollment in a transaction.
 * Throws DuplicateStudentError if modelCode, email, or NIC is already taken.
 */
export async function createStudentAndEnrollment(
  data: CreateStudentData,
  tx?: Prisma.TransactionClient | PrismaClient,
): Promise<{ studentId: string; modelCode: string }> {
  const client = (tx ?? defaultPrisma) as PrismaClient;
  const normalizedNic = data.nic.trim().toUpperCase();

  const normalizedEmail = data.email.trim().toLowerCase();

  const [modelDup, emailDup, nicDup] = await Promise.all([
    client.student.findFirst({
      where: { modelCode: data.modelCode },
      select: { id: true },
    }),
    client.student.findFirst({
      where: emailDuplicateWhere(normalizedEmail),
      select: { id: true },
    }),
    client.student.findFirst({
      where: nicDuplicateWhere(normalizedNic),
      select: { id: true },
    }),
  ]);

  if (modelDup) throw new DuplicateStudentError("modelCode", modelDup.id);
  if (emailDup) throw new DuplicateStudentError("email", emailDup.id);
  if (nicDup) throw new DuplicateStudentError("nic", nicDup.id);

  const piiWrite = encryptStudentPiiForWrite({
    email: normalizedEmail,
    fullName: data.fullName,
    gender: data.gender,
    nic: normalizedNic,
    dob: data.dob,
    address: data.address,
    contactNumber: data.contactNumber,
    whatsappNumber: data.whatsappNumber,
    height: data.height,
    weight: data.weight,
    chest: data.chest,
    shoulder: data.shoulder,
    waist: data.waist,
    shoeSize: data.shoeSize,
    skinColorOptionId: data.skinColorOptionId,
    eyeColor: data.eyeColor,
    hairColor: data.hairColor,
    talents: data.talents,
    preferredBranchRaw: data.preferredBranchRaw,
    preferredDate: data.preferredDate,
  });

  const interestIds = [...new Set(data.modelingInterestIds ?? [])];

  return client.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        ...piiWrite,
        modelCode: data.modelCode,
        source: data.source,
        age: data.age,
        photoUrl: data.photoUrl ?? null,
        preferredBranchId: data.preferredBranchId ?? null,
      },
    });

    await syncStudentSearchTokens(
      tx,
      student.id,
      data.fullName.trim(),
      normalizedNic,
    );

    if (interestIds.length > 0) {
      await tx.studentModelingInterest.createMany({
        data: interestIds.map((optionId) => ({
          studentId: student.id,
          optionId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.enrollment.create({
      data: {
        studentId: student.id,
        status: "UNASSIGNED",
        batchId: null,
      },
    });

    return { studentId: student.id, modelCode: student.modelCode };
  });
}
