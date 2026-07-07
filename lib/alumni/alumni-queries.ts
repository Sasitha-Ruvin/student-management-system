import type { Prisma } from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";
import { maskNic } from "@/lib/pii-crypto";
import {
  buildStudentTextSearchWhere,
  decryptStudentPii,
  STUDENT_PII_SELECT,
} from "@/lib/students/student-pii";
import {
  isLegacyAlumniBatch,
  parseGraduatedIntakeFromNotes,
} from "@/lib/alumni/legacy-alumni-batch";
import type { AlumniListItem, AlumniListPage } from "@/types/api/alumni";

export type ListAlumniOptions = {
  branchId?: string | null;
  batchId?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
};

const alumniSelect = {
  id: true,
  studentId: true,
  batchId: true,
  previousBatchId: true,
  graduatedAt: true,
  notes: true,
  student: {
    select: {
      modelCode: true,
      ...STUDENT_PII_SELECT,
    },
  },
  batch: {
    select: {
      batchCode: true,
      name: true,
      branch: { select: { name: true } },
    },
  },
  previousBatch: {
    select: {
      batchCode: true,
      name: true,
    },
  },
} as const;

function alumniWhere(opts: ListAlumniOptions): Prisma.AlumniWhereInput {
  const { branchId, batchId, search } = opts;
  return {
    ...(batchId ? { batchId } : {}),
    ...(branchId ? { batch: { branchId } } : {}),
    ...(search
      ? {
          student: { OR: buildStudentTextSearchWhere(search) },
        }
      : {}),
  };
}

function mapAlumniRow(
  row: Prisma.AlumniGetPayload<{ select: typeof alumniSelect }>,
): AlumniListItem {
  const legacyIntake = isLegacyAlumniBatch(row.batch.batchCode)
    ? parseGraduatedIntakeFromNotes(row.notes)
    : null;

  const pii = decryptStudentPii(row.student);

  return {
    alumniId: row.id,
    studentId: row.studentId,
    fullName: row.student.fullName,
    modelCode: row.student.modelCode,
    nic: maskNic(pii.nic),
    email: row.student.email,
    batchId: row.batchId,
    batchCode: row.batch.batchCode,
    batchName: row.batch.name,
    graduatedIntake: legacyIntake,
    previousBatchId: row.previousBatchId,
    previousBatchCode: row.previousBatch?.batchCode ?? null,
    previousBatchName: row.previousBatch?.name ?? null,
    graduatedAt: row.graduatedAt.toISOString(),
    branchName: row.batch.branch.name,
  };
}

export async function listAlumniPage(
  opts: ListAlumniOptions,
): Promise<AlumniListPage> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const where = alumniWhere(opts);
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.alumni.findMany({
      where,
      select: alumniSelect,
      orderBy: [{ graduatedAt: "desc" }, { student: { modelCode: "asc" } }],
      skip,
      take: limit,
    }),
    prisma.alumni.count({ where }),
  ]);

  return {
    items: rows.map(mapAlumniRow),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function fetchAlumniById(
  alumniId: string,
): Promise<AlumniListItem | null> {
  const row = await prisma.alumni.findUnique({
    where: { id: alumniId },
    select: alumniSelect,
  });
  return row ? mapAlumniRow(row) : null;
}
