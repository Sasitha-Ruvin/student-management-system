import type {
  StudentDetail,
  StudentDetailApiResponse,
  StudentEnrollmentRow,
  StudentListItem,
} from "@/types/api/student";
import { maskNic } from "@/lib/pii-crypto/masks";
import { studentPhotoProxyUrl } from "@/lib/storage/proxy-urls";
import { decryptEnrollmentNotes } from "@/lib/payments/payment-sensitive";
import { toStudentDocumentDto } from "@/lib/students/student-document-mappers";
import {
  decryptStudentPiiSafe,
  maskStudentPhones,
  type StudentPiiDbRow,
} from "@/lib/students/student-pii";

type PrismaEnrollmentForStudent = {
  id: string;
  batchId: string | null;
  status: string;
  paymentPath: string | null;
  installmentSource: string | null;
  paymentPlanId: string | null;
  paymentPlan: { name: string } | null;
  customCourseFee: unknown;
  regFeePaid: boolean;
  notes: string | null;
  notesEnc: string | null;
  createdAt: Date;
  batch: {
    batchCode: string;
    name: string;
    registrationFee?: unknown;
    branch: { name: string };
  } | null;
  installments: Array<{ amount: unknown; paidAmount: unknown }>;
};

type PrismaStudentForList = StudentPiiDbRow & {
  id: string;
  modelCode: string;
  gender: string;
  age: number;
  source: string;
  photoUrl: string | null;
  preferredBranchId: string | null;
  preferredBranch: { name: string } | null;
  createdAt: Date;
  supabaseId: string | null;
  isLoginEnabled: boolean;
  enrollments: Array<{
    id: string;
    status: string;
    batchId: string | null;
    regFeePaid: boolean;
    batch: { name: string; batchCode: string } | null;
  }>;
};

type PrismaStudentForDetail = PrismaStudentForList & {
  isLoginEnabled: boolean;
  supabaseId: string | null;
  updatedAt: Date;
  skinColorOption: { label: string } | null;
  modelingInterests: Array<{ optionId: string; option: { label: string } }>;
  documents: Array<{
    id: string;
    type: "NIC_FRONT" | "NIC_BACK" | "PROFESSIONAL_PHOTO";
    mimeType: string;
    sortOrder: number;
    storagePath: string;
    createdAt: Date;
  }>;
  enrollments: PrismaEnrollmentForStudent[];
};

type ListMapperOptions = {
  /** Mask NIC and phone numbers in list JSON (name/email stay readable for admins). */
  maskNicAndPhones?: boolean;
};

function getPrimaryEnrollment(
  enrollments: PrismaStudentForList["enrollments"],
) {
  if (enrollments.length === 0) return null;
  const active = enrollments.find((e) => e.status === "ACTIVE");
  if (active) return active;
  const unassigned = enrollments.find((e) => e.status === "UNASSIGNED");
  if (unassigned) return unassigned;
  return enrollments[enrollments.length - 1];
}

export function toStudentListItem(
  s: PrismaStudentForList,
  options: ListMapperOptions = {},
): StudentListItem {
  const pii = decryptStudentPiiSafe(s);
  const primary = getPrimaryEnrollment(s.enrollments);
  const mask = options.maskNicAndPhones === true;
  const nicDisplay = pii.piiDecryptFailed
    ? "Unavailable"
    : mask
      ? maskNic(pii.nic)
      : pii.nic;
  const phones = pii.piiDecryptFailed
    ? { contactNumber: "Unavailable", whatsappNumber: "Unavailable" }
    : mask
      ? maskStudentPhones(s)
      : {
          contactNumber: pii.contactNumber,
          whatsappNumber: pii.whatsappNumber,
        };

  return {
    id: s.id,
    modelCode: s.modelCode,
    fullName: s.fullName,
    email: s.email,
    gender: s.gender,
    contactNumber: phones.contactNumber,
    whatsappNumber: phones.whatsappNumber,
    nic: nicDisplay,
    age: s.age,
    source: s.source as StudentListItem["source"],
    photoUrl: studentPhotoProxyUrl(s.id, s.photoUrl),
    preferredBranchId: s.preferredBranchId,
    preferredBranchName: s.preferredBranch?.name ?? null,
    preferredBranchRaw: s.preferredBranchRaw,
    preferredDate: s.preferredDate,
    enrollmentStatus: primary
      ? (primary.status as StudentListItem["enrollmentStatus"])
      : null,
    currentBatchName: primary?.batch?.name ?? null,
    currentBatchCode: primary?.batch?.batchCode ?? null,
    primaryEnrollmentId: primary?.id ?? null,
    primaryBatchId: primary?.batchId ?? null,
    regFeePaid: primary ? primary.regFeePaid : null,
    hasPortalAccount: s.supabaseId !== null,
    isLoginEnabled: s.isLoginEnabled,
    createdAt: s.createdAt.toISOString(),
  };
}

export function toEnrollmentRow(
  e: PrismaEnrollmentForStudent,
): StudentEnrollmentRow {
  const totalOwed = e.installments.reduce(
    (sum, i) => sum + Number(i.amount),
    0,
  );
  const totalPaid = e.installments.reduce(
    (sum, i) => sum + Number(i.paidAmount),
    0,
  );
  return {
    enrollmentId: e.id,
    batchId: e.batchId,
    batchCode: e.batch?.batchCode ?? null,
    batchName: e.batch?.name ?? null,
    branchName: e.batch?.branch?.name ?? null,
    status: e.status as StudentEnrollmentRow["status"],
    paymentPath: e.paymentPath as StudentEnrollmentRow["paymentPath"],
    installmentSource:
      e.installmentSource as StudentEnrollmentRow["installmentSource"],
    paymentPlanId: e.paymentPlanId,
    paymentPlanName: e.paymentPlan?.name ?? null,
    customCourseFee: e.customCourseFee !== null ? Number(e.customCourseFee) : null,
    regFeePaid: e.regFeePaid,
    registrationFee:
      e.batch?.registrationFee !== undefined && e.batch?.registrationFee !== null
        ? Number(e.batch.registrationFee)
        : null,
    notes: decryptEnrollmentNotes(e),
    totalPaid,
    totalOwed,
    createdAt: e.createdAt.toISOString(),
  };
}

/** Decrypted fields for admin UI (server components / server actions). */
export function toStudentDetailDecrypted(s: PrismaStudentForDetail): StudentDetail {
  const pii = decryptStudentPiiSafe(s);
  const dobIso = pii.piiDecryptFailed
    ? "Unavailable"
    : pii.dob.toISOString().split("T")[0]!;

  return {
    ...toStudentListItem(s, { maskNicAndPhones: false }),
    dob: dobIso,
    contactNumber: pii.contactNumber,
    whatsappNumber: pii.whatsappNumber,
    address: pii.address,
    height: pii.height,
    weight: pii.weight,
    chest: pii.chest,
    shoulder: pii.shoulder,
    waist: pii.waist,
    shoeSize: pii.shoeSize,
    skinColorOptionId: pii.skinColorOptionId,
    skinColorLabel: s.skinColorOption?.label ?? null,
    eyeColor: pii.eyeColor,
    hairColor: pii.hairColor,
    talents: pii.talents,
    modelingInterests: s.modelingInterests.map((i) => i.option.label),
    modelingInterestIds: s.modelingInterests.map((i) => i.optionId),
    documents: s.documents.map((doc) => toStudentDocumentDto(s.id, doc)),
    isLoginEnabled: s.isLoginEnabled,
    loginDisabledNote: pii.loginDisabledNote,
    hasPortalAccount: s.supabaseId !== null,
    enrollments: s.enrollments.map(toEnrollmentRow),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** GET /api/students/[id] — ciphertext only for sensitive PII. */
export function toStudentDetailApi(s: PrismaStudentForDetail): StudentDetailApiResponse {
  const listBase = toStudentListItem(s, { maskNicAndPhones: true });

  return {
    id: listBase.id,
    modelCode: listBase.modelCode,
    fullName: listBase.fullName,
    email: listBase.email,
    gender: listBase.gender,
    age: listBase.age,
    source: listBase.source,
    photoUrl: listBase.photoUrl,
    preferredBranchId: listBase.preferredBranchId,
    preferredBranchName: listBase.preferredBranchName,
    preferredBranchRaw: listBase.preferredBranchRaw,
    preferredDate: listBase.preferredDate,
    enrollmentStatus: listBase.enrollmentStatus,
    currentBatchName: listBase.currentBatchName,
    currentBatchCode: listBase.currentBatchCode,
    primaryEnrollmentId: listBase.primaryEnrollmentId,
    primaryBatchId: listBase.primaryBatchId,
    regFeePaid: listBase.regFeePaid,
    hasPortalAccount: listBase.hasPortalAccount,
    isLoginEnabled: listBase.isLoginEnabled,
    createdAt: listBase.createdAt,
    nicEnc: s.nicEnc,
    nicHash: s.nicHash,
    dobEnc: s.dobEnc,
    addressEnc: s.addressEnc,
    contactNumberEnc: s.contactNumberEnc,
    whatsappNumberEnc: s.whatsappNumberEnc,
    heightEnc: s.heightEnc,
    weightEnc: s.weightEnc,
    chestEnc: s.chestEnc,
    shoulderEnc: s.shoulderEnc,
    waistEnc: s.waistEnc,
    shoeSizeEnc: s.shoeSizeEnc,
    skinColorOptionId: s.skinColorOptionId,
    eyeColorEnc: s.eyeColorEnc,
    hairColorEnc: s.hairColorEnc,
    talentsEnc: s.talentsEnc,
    loginDisabledNote: s.loginDisabledNote,
    modelingInterests: s.modelingInterests.map((i) => i.option.label),
    documents: s.documents.map((doc) => toStudentDocumentDto(s.id, doc)),
    enrollments: s.enrollments.map(toEnrollmentRow),
    updatedAt: s.updatedAt.toISOString(),
  };
}
