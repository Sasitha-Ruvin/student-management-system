import { prisma } from "@/lib/prisma";
import { syncStudentDocumentsFromStorage } from "@/lib/storage/sync-student-documents";
import {
  buildStudentTextSearchWhere,
  decryptStudentPiiSafe,
  STUDENT_PII_SELECT,
} from "@/lib/students/student-pii";
import {
  toStudentDetailApi,
  toStudentDetailDecrypted,
  toStudentListItem,
} from "./student-mappers";
import type {
  StudentDetail,
  StudentDetailApiResponse,
  StudentListItem,
  StudentListPage,
  StudentListQuery,
} from "@/types/api/student";

const ENROLLMENT_SELECT = {
  id: true,
  batchId: true,
  status: true,
  paymentPath: true,
  installmentSource: true,
  paymentPlanId: true,
  customCourseFee: true,
  regFeePaid: true,
  notes: true,
  notesEnc: true,
  createdAt: true,
  paymentPlan: { select: { name: true } },
  batch: {
    select: {
      batchCode: true,
      name: true,
      registrationFee: true,
      branch: { select: { name: true } },
    },
  },
  installments: {
    where: { status: { not: "CANCELLED" } },
    select: { amount: true, paidAmount: true },
  },
} as const;

const STUDENT_LIST_SELECT = {
  id: true,
  modelCode: true,
  ...STUDENT_PII_SELECT,
  age: true,
  source: true,
  photoUrl: true,
  preferredBranchId: true,
  preferredBranch: { select: { name: true } },
  supabaseId: true,
  isLoginEnabled: true,
  createdAt: true,
  enrollments: {
    select: {
      id: true,
      status: true,
      batchId: true,
      regFeePaid: true,
      batch: { select: { name: true, batchCode: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
} as const;

function buildWhere(query: StudentListQuery) {
  const where: Record<string, unknown> = {};

  if (query.search?.trim()) {
    where.OR = buildStudentTextSearchWhere(query.search);
  }

  if (query.source && query.source !== "all") {
    where.source = query.source;
  }

  if (query.branchId) {
    where.preferredBranchId = query.branchId;
  }

  if (query.listTab === "pending") {
    where.enrollments = {
      some: { status: "UNASSIGNED" },
    };
  } else if (query.listTab === "enrolled") {
    if (
      query.enrollmentStatus &&
      query.enrollmentStatus !== "all" &&
      query.enrollmentStatus !== "UNASSIGNED"
    ) {
      where.enrollments = {
        some: { status: query.enrollmentStatus },
      };
    } else {
      where.enrollments = {
        some: { status: { not: "UNASSIGNED" } },
      };
    }
  } else if (query.enrollmentStatus && query.enrollmentStatus !== "all") {
    where.enrollments = {
      some: { status: query.enrollmentStatus },
    };
  }

  return where;
}

export async function fetchStudentList(
  query: StudentListQuery,
): Promise<StudentListPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildWhere(query);

  const [rows, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select: STUDENT_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.student.count({ where }),
  ]);

  return {
    items: rows.map((row) =>
      toStudentListItem(row as Parameters<typeof toStudentListItem>[0], {
        maskNicAndPhones: true,
      }),
    ) as StudentListItem[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

const STUDENT_DETAIL_SELECT = {
  ...STUDENT_LIST_SELECT,
  isLoginEnabled: true,
  supabaseId: true,
  updatedAt: true,
  skinColorOption: { select: { label: true } },
  modelingInterests: {
    select: { optionId: true, option: { select: { label: true } } },
  },
  documents: {
    orderBy: [{ type: "asc" as const }, { sortOrder: "asc" as const }],
  },
  enrollments: {
    select: ENROLLMENT_SELECT,
    orderBy: { createdAt: "desc" as const },
  },
};

/** Decrypted detail for server UI only. */
export async function fetchStudentDetailDecrypted(
  id: string,
): Promise<StudentDetail | null> {
  const student = await prisma.student.findUnique({
    where: { id },
    select: STUDENT_DETAIL_SELECT,
  });

  if (!student) return null;

  await syncStudentDocumentsFromStorage(id, student.photoUrl);

  const refreshed = await prisma.student.findUnique({
    where: { id },
    select: STUDENT_DETAIL_SELECT,
  });
  if (!refreshed) return null;

  return toStudentDetailDecrypted(
    refreshed as Parameters<typeof toStudentDetailDecrypted>[0],
  );
}

/** Encrypted-at-rest fields in JSON for GET /api/students/[id]. */
export async function fetchStudentDetailApi(
  id: string,
): Promise<StudentDetailApiResponse | null> {
  const student = await prisma.student.findUnique({
    where: { id },
    select: STUDENT_DETAIL_SELECT,
  });

  if (!student) return null;

  await syncStudentDocumentsFromStorage(id, student.photoUrl);

  const refreshed = await prisma.student.findUnique({
    where: { id },
    select: STUDENT_DETAIL_SELECT,
  });
  if (!refreshed) return null;

  return toStudentDetailApi(refreshed as Parameters<typeof toStudentDetailApi>[0]);
}

export async function fetchStudentByIdOrNull(id: string) {
  const row = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      supabaseId: true,
      isLoginEnabled: true,
      modelCode: true,
      ...STUDENT_PII_SELECT,
    },
  });

  if (!row) return null;

  const pii = decryptStudentPiiSafe(row);
  return {
    id: row.id,
    email: pii.email,
    supabaseId: row.supabaseId,
    isLoginEnabled: row.isLoginEnabled,
    fullName: pii.fullName,
    modelCode: row.modelCode,
    contactNumber: pii.contactNumber,
    whatsappNumber: pii.whatsappNumber,
  };
}
