import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  invalidateBranches,
  invalidateDashboard,
  invalidateOperationalData,
  invalidateStudents,
} from "@/lib/api/invalidate-cache";
import {
  extractStudentPhotoPath,
  STUDENTS_STORAGE_BUCKET,
  uploadPhotoFromFile,
} from "@/lib/storage/photo";
import { validateNic } from "@/lib/students/nic-validator";
import { recalculateOpenInstallmentAmounts } from "@/lib/payments/recalculate-open-installment-amounts";
import {
  encryptEnrollmentNotesForWrite,
} from "@/lib/payments/payment-sensitive";
import {
  decryptStudentPii,
  emailDuplicateWhere,
  encryptStudentPiiForWrite,
  nicDuplicateWhere,
  STUDENT_PII_SELECT,
  syncStudentSearchTokens,
} from "@/lib/students/student-pii";
import { validateStudentFields } from "@/lib/students/student-validation";
import { fetchStudentDetailDecrypted } from "@/lib/students/student-queries";
import type { StudentDetail } from "@/types/api/student";
import type { UpdateEnrollmentPatch, UpdateStudentBody } from "@/types/api/student";

const FEE_EDITABLE_STATUSES = new Set(["ACTIVE", "SUSPENDED", "ON_HOLD"]);

export class UpdateStudentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly field?: string,
    public readonly errors?: Record<string, string>,
  ) {
    super(message);
    this.name = "UpdateStudentError";
  }
}

export type UpdateStudentOptions = {
  photoFile?: File | null;
  removePhoto?: boolean;
};

export type UpdateStudentResult = {
  detail: StudentDetail;
  warnings: string[];
};

async function removeStudentPhoto(studentId: string, photoUrl: string | null) {
  if (!photoUrl) return;

  try {
    const path = extractStudentPhotoPath(photoUrl);
    if (path) {
      const supabase = createAdminClient();
      await supabase.storage.from(STUDENTS_STORAGE_BUCKET).remove([path]);
    }
  } catch {
    // Best-effort storage cleanup
  }
}

async function syncSupabaseEmail(supabaseId: string, email: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(supabaseId, {
    email,
    email_confirm: true,
  });

  if (error) {
    throw new UpdateStudentError(
      `Failed to update portal login email: ${error.message}`,
      400,
      "email",
    );
  }
}

async function validateEnrollmentPatches(
  studentId: string,
  patches: UpdateEnrollmentPatch[],
): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];

  for (const patch of patches) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: patch.enrollmentId, studentId },
      select: {
        id: true,
        status: true,
        customCourseFee: true,
        batch: { select: { courseFee: true } },
        installments: {
          select: { paidAmount: true, status: true },
        },
      },
    });

    if (!enrollment) {
      throw new UpdateStudentError(
        `Enrollment ${patch.enrollmentId} not found for this student`,
        404,
      );
    }

    const canEditFees = FEE_EDITABLE_STATUSES.has(enrollment.status);

    if (
      (patch.customCourseFee !== undefined || patch.regFeePaid !== undefined) &&
      !canEditFees
    ) {
      throw new UpdateStudentError(
        `Cannot change fees for enrollment with status ${enrollment.status}`,
        422,
        "enrollments",
      );
    }

    if (patch.customCourseFee !== undefined && patch.customCourseFee !== null) {
      if (patch.customCourseFee < 0) {
        throw new UpdateStudentError(
          "Course fee must be zero or greater",
          400,
          "customCourseFee",
        );
      }

      const totalPaid = enrollment.installments.reduce(
        (sum, i) => sum + Number(i.paidAmount),
        0,
      );

      if (patch.customCourseFee < totalPaid) {
        throw new UpdateStudentError(
          `Course fee cannot be less than amount already collected (${totalPaid.toFixed(2)})`,
          422,
          "customCourseFee",
        );
      }

      const prevFee =
        enrollment.customCourseFee !== null
          ? Number(enrollment.customCourseFee)
          : Number(enrollment.batch?.courseFee ?? 0);

      const nextFee =
        patch.customCourseFee !== null
          ? patch.customCourseFee
          : Number(enrollment.batch?.courseFee ?? 0);

      if (Math.abs(prevFee - nextFee) > 0.001) {
        const hasOpenInstallments = enrollment.installments.some(
          (i) => i.status !== "PAID" && i.status !== "CANCELLED",
        );
        if (hasOpenInstallments && !patch.recalculateOpenInstallments) {
          warnings.push(
            "Custom course fee was updated but existing instalment amounts were not recalculated.",
          );
        }
      }
    }
  }

  return { warnings };
}

export async function updateStudentWithEnrollments(
  studentId: string,
  body: UpdateStudentBody,
  options: UpdateStudentOptions = {},
): Promise<UpdateStudentResult> {
  const existing = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      ...STUDENT_PII_SELECT,
      supabaseId: true,
      photoUrl: true,
      preferredBranchId: true,
    },
  });

  if (!existing) {
    throw new UpdateStudentError("Student not found", 404);
  }

  const email = body.email.toLowerCase().trim();
  const nicResult = validateNic(body.nic.trim());
  if (!nicResult.valid) {
    throw new UpdateStudentError(
      nicResult.error ?? "Invalid NIC format",
      400,
      "nic",
    );
  }
  const nic = nicResult.normalised;
  const existingPii = decryptStudentPii(existing);

  const { errors, warnings: validationWarnings } = validateStudentFields({
    fullName: body.fullName,
    email,
    nic,
    dob: body.dob,
    age: body.age,
    gender: body.gender,
    contactNumber: body.contactNumber,
    whatsappNumber: body.whatsappNumber,
    address: body.address,
    height: body.height,
    weight: body.weight,
    chest: body.chest,
    shoulder: body.shoulder,
    waist: body.waist,
    shoeSize: body.shoeSize,
    skinColorOptionId: body.skinColorOptionId,
    eyeColor: body.eyeColor,
    hairColor: body.hairColor,
    talents: body.talents,
    preferredDate: body.preferredDate,
  });

  if (Object.keys(errors).length > 0) {
    throw new UpdateStudentError("Validation failed", 400, undefined, errors);
  }

  const skinColorOptionId =
    body.skinColorOptionId !== undefined
      ? body.skinColorOptionId?.trim() || null
      : undefined;

  if (skinColorOptionId) {
    const option = await prisma.registrationSkinColorOption.findFirst({
      where: { id: skinColorOptionId, isActive: true },
      select: { id: true },
    });
    if (!option) {
      throw new UpdateStudentError(
        "Invalid skin color selection",
        400,
        "skinColorOptionId",
      );
    }
  }

  const modelingInterestIds =
    body.modelingInterestIds !== undefined
      ? [...new Set(body.modelingInterestIds)]
      : undefined;

  if (modelingInterestIds && modelingInterestIds.length > 0) {
    const validCount = await prisma.registrationModelingInterestOption.count({
      where: { id: { in: modelingInterestIds }, isActive: true },
    });
    if (validCount !== modelingInterestIds.length) {
      throw new UpdateStudentError(
        "One or more modeling interests are invalid",
        400,
        "modelingInterestIds",
      );
    }
  }

  if (email !== existingPii.email) {
    const dup = await prisma.student.findFirst({
      where: { ...emailDuplicateWhere(email), NOT: { id: studentId } },
      select: { id: true },
    });
    if (dup) {
      throw new UpdateStudentError(
        "A student with this email already exists",
        409,
        "email",
      );
    }
  }

  if (nic !== existingPii.nic) {
    const dup = await prisma.student.findFirst({
      where: { ...nicDuplicateWhere(nic), NOT: { id: studentId } },
      select: { id: true },
    });
    if (dup) {
      throw new UpdateStudentError(
        "A student with this NIC already exists",
        409,
        "nic",
      );
    }
  }

  let preferredBranchId: string | null = existing.preferredBranchId;
  if (body.preferredBranchId !== undefined) {
    if (body.preferredBranchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: body.preferredBranchId, isActive: true },
        select: { id: true },
      });
      preferredBranchId = branch?.id ?? null;
    } else {
      preferredBranchId = null;
    }
  }

  const enrollmentPatches = body.enrollments ?? [];
  const enrollmentWarnings = (
    await validateEnrollmentPatches(studentId, enrollmentPatches)
  ).warnings;

  const warnings = [...validationWarnings, ...enrollmentWarnings];

  if (email !== existingPii.email && existing.supabaseId) {
    await syncSupabaseEmail(existing.supabaseId, email);
  }

  let photoUrl: string | undefined | null = undefined;

  if (options.removePhoto) {
    await removeStudentPhoto(studentId, existing.photoUrl);
    photoUrl = null;
  } else if (options.photoFile && options.photoFile.size > 0) {
    photoUrl = await uploadPhotoFromFile(options.photoFile, studentId);
  }

  const batchIdsToInvalidate = new Set<string>();

  const piiWrite = encryptStudentPiiForWrite({
    email,
    fullName: body.fullName,
    gender: body.gender,
    nic,
    dob: new Date(body.dob),
    address: body.address,
    contactNumber: body.contactNumber,
    whatsappNumber: body.whatsappNumber,
    height: body.height !== undefined ? body.height : existingPii.height,
    weight: body.weight !== undefined ? body.weight : existingPii.weight,
    chest: body.chest !== undefined ? body.chest : existingPii.chest,
    shoulder: body.shoulder !== undefined ? body.shoulder : existingPii.shoulder,
    waist: body.waist !== undefined ? body.waist : existingPii.waist,
    shoeSize: body.shoeSize !== undefined ? body.shoeSize : existingPii.shoeSize,
    skinColorOptionId:
      skinColorOptionId !== undefined
        ? skinColorOptionId
        : existingPii.skinColorOptionId,
    eyeColor: body.eyeColor !== undefined ? body.eyeColor : existingPii.eyeColor,
    hairColor: body.hairColor !== undefined ? body.hairColor : existingPii.hairColor,
    talents: body.talents !== undefined ? body.talents : existingPii.talents,
    preferredDate: body.preferredDate,
  });

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: studentId },
      data: {
        ...piiWrite,
        age: body.age,
        preferredBranchId,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
    });

    if (modelingInterestIds !== undefined) {
      await tx.studentModelingInterest.deleteMany({ where: { studentId } });
      if (modelingInterestIds.length > 0) {
        await tx.studentModelingInterest.createMany({
          data: modelingInterestIds.map((optionId) => ({
            studentId,
            optionId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const nameOrNicChanged =
      body.fullName.trim() !== existingPii.fullName || nic !== existingPii.nic;
    if (nameOrNicChanged) {
      await syncStudentSearchTokens(
        tx,
        studentId,
        body.fullName.trim(),
        nic,
      );
    }

    for (const patch of enrollmentPatches) {
      const data: {
        notes?: string | null;
        customCourseFee?: number | null;
        regFeePaid?: boolean;
      } = {};

      if (patch.notes !== undefined) {
        Object.assign(data, encryptEnrollmentNotesForWrite(patch.notes));
      }
      if (patch.customCourseFee !== undefined) {
        data.customCourseFee = patch.customCourseFee;
      }
      if (patch.regFeePaid !== undefined) {
        data.regFeePaid = patch.regFeePaid;
      }

      if (Object.keys(data).length === 0 && !patch.recalculateOpenInstallments) {
        continue;
      }

      const before = await tx.enrollment.findFirst({
        where: { id: patch.enrollmentId, studentId },
        select: {
          customCourseFee: true,
          batch: { select: { courseFee: true } },
        },
      });

      if (Object.keys(data).length > 0) {
        const updated = await tx.enrollment.update({
          where: { id: patch.enrollmentId },
          data,
          select: { batchId: true },
        });

        if (updated.batchId) {
          batchIdsToInvalidate.add(updated.batchId);
        }
      }

      if (
        patch.recalculateOpenInstallments &&
        patch.customCourseFee !== undefined &&
        before
      ) {
        const oldEffectiveFee =
          before.customCourseFee !== null
            ? Number(before.customCourseFee)
            : Number(before.batch?.courseFee ?? 0);
        const newEffectiveFee =
          patch.customCourseFee !== null
            ? patch.customCourseFee
            : Number(before.batch?.courseFee ?? 0);

        await recalculateOpenInstallmentAmounts(
          tx,
          patch.enrollmentId,
          oldEffectiveFee,
          newEffectiveFee,
        );
      }
    }
  });

  invalidateStudents();
  invalidateDashboard();
  invalidateBranches(preferredBranchId ?? undefined);
  for (const batchId of batchIdsToInvalidate) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { branchId: true },
    });
    invalidateOperationalData({
      batchId,
      branchId: batch?.branchId,
    });
  }

  const detail = await fetchStudentDetailDecrypted(studentId);
  if (!detail) {
    throw new UpdateStudentError("Student not found after update", 500);
  }

  return { detail, warnings };
}
