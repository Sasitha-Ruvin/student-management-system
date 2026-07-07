import {
  invalidateDashboard,
  invalidateOperationalData,
  invalidateStudents,
} from "@/lib/api/invalidate-cache";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normaliseDocumentStoragePath,
  STUDENT_DOCUMENTS_BUCKET,
} from "@/lib/storage/student-documents";
import {
  extractStudentPhotoPath,
  STUDENTS_STORAGE_BUCKET,
} from "@/lib/storage/photo";

export class DeleteStudentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DeleteStudentError";
  }
}

async function removeStudentPhotoFromStorage(photoUrl: string | null) {
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

async function removeStudentDocumentsFromStorage(storagePaths: string[]) {
  if (storagePaths.length === 0) return;

  try {
    const supabase = createAdminClient();
    const paths = storagePaths.map((p) => normaliseDocumentStoragePath(p));
    await supabase.storage.from(STUDENT_DOCUMENTS_BUCKET).remove(paths);
  } catch {
    // Best-effort storage cleanup
  }
}

async function removeSupabaseAuthUser(supabaseId: string | null) {
  if (!supabaseId) return;

  try {
    const supabase = createAdminClient();
    await supabase.auth.admin.deleteUser(supabaseId);
  } catch (err) {
    console.warn(
      `[delete-student] Failed to delete Supabase user ${supabaseId}:`,
      err,
    );
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      supabaseId: true,
      photoUrl: true,
      enrollments: { select: { id: true } },
      documents: { select: { storagePath: true } },
    },
  });

  if (!student) {
    throw new DeleteStudentError("Student not found", 404);
  }

  const enrollmentIds = student.enrollments.map((e) => e.id);

  const [paymentCount, invoiceCount, alumni, transferCount] = await Promise.all([
    prisma.payment.count({ where: { studentId } }),
    prisma.invoice.count({ where: { studentId } }),
    prisma.alumni.findUnique({ where: { studentId }, select: { id: true } }),
    enrollmentIds.length > 0
      ? prisma.transferSettlement.count({
          where: {
            OR: [
              { sourceEnrollmentId: { in: enrollmentIds } },
              { targetEnrollmentId: { in: enrollmentIds } },
            ],
          },
        })
      : Promise.resolve(0),
  ]);

  if (paymentCount > 0) {
    throw new DeleteStudentError(
      `Cannot delete — student has ${paymentCount} payment record${paymentCount === 1 ? "" : "s"}`,
      409,
    );
  }

  if (invoiceCount > 0) {
    throw new DeleteStudentError(
      `Cannot delete — student has ${invoiceCount} invoice record${invoiceCount === 1 ? "" : "s"}`,
      409,
    );
  }

  if (alumni) {
    throw new DeleteStudentError(
      "Cannot delete — student has an alumni record",
      409,
    );
  }

  if (transferCount > 0) {
    throw new DeleteStudentError(
      "Cannot delete — student has batch transfer history",
      409,
    );
  }

  const documentPaths = student.documents.map((d) => d.storagePath);
  const photoUrl = student.photoUrl;
  const supabaseId = student.supabaseId;

  await prisma.$transaction(async (tx) => {
    if (enrollmentIds.length > 0) {
      await tx.installment.deleteMany({
        where: { enrollmentId: { in: enrollmentIds } },
      });
      await tx.enrollment.deleteMany({ where: { studentId } });
    }
    await tx.student.delete({ where: { id: studentId } });
  });

  await Promise.all([
    removeStudentPhotoFromStorage(photoUrl),
    removeStudentDocumentsFromStorage(documentPaths),
    removeSupabaseAuthUser(supabaseId),
  ]);

  invalidateStudents();
  invalidateDashboard();
  invalidateOperationalData();
}
