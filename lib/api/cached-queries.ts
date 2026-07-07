import {
  paymentPlanInclude,
  toAcademySettingsDto,
  toPaymentPlanDto,
} from "@/lib/api/settings-mappers";
import { fetchBranchDetail } from "@/lib/branches/branch-detail-queries";
import {
  fetchBatchDetail,
  fetchBatchListPage,
  type BatchListQuery,
} from "@/lib/batches/batch-queries";
import type { BranchDetail } from "@/types/api/branch";
import type {
  BatchDetail,
  BatchListPage,
  SessionListPage,
  SessionListQuery,
} from "@/types/api/batch";
import {
  fetchBranchListPage,
  fetchBranchPicker,
  type BranchListPage,
  type BranchListQuery,
  type BranchPickerItem,
} from "@/lib/branches/branch-list-queries";
import { fetchDashboardStats } from "@/lib/dashboard/dashboard-queries";
import { fetchSessionListPage } from "@/lib/sessions/session-list-queries";
import { fetchStudentList } from "@/lib/students/student-queries";
import type { StudentListQuery } from "@/types/api/student";
import { listAlumniPage, type ListAlumniOptions } from "@/lib/alumni/alumni-queries";
import { prisma } from "@/lib/prisma";
import type { DashboardStats } from "@/types/api/dashboard";
import { listSessionSmsTemplates } from "@/lib/sms/session-sms-template-queries";
import {
  listRegistrationEyeColors,
  listRegistrationHairColors,
  listRegistrationModelingInterests,
  listRegistrationSkinColors,
} from "@/lib/registration/registration-option-queries";
import type { SettingsResponseDto } from "@/types/api/settings";
import type { StudentListPage } from "@/types/api/student";
import type { AlumniListPage } from "@/types/api/alumni";

const SETTINGS_ID = "default";

// Admin portal list/detail queries hit the database on every request.
// Do not wrap these in unstable_cache — external DB changes (manual wipes, seeds)
// must show up immediately without waiting for TTL or mutation invalidation.

export function getCachedBranchListPage(query: BranchListQuery) {
  return fetchBranchListPage(query);
}

export function getCachedBranchPicker() {
  return fetchBranchPicker();
}

export function getCachedBranchDetail(branchId: string) {
  return fetchBranchDetail(branchId);
}

export function getCachedBatchListPage(query: BatchListQuery): Promise<BatchListPage> {
  return fetchBatchListPage(query);
}

export function getCachedBatchDetail(batchId: string): Promise<BatchDetail | null> {
  return fetchBatchDetail(batchId);
}

export function getCachedStudentListPage(query: StudentListQuery): Promise<StudentListPage> {
  return fetchStudentList(query);
}

export function getCachedSessionListPage(query: SessionListQuery): Promise<SessionListPage> {
  return fetchSessionListPage(query);
}

export function getCachedAlumniListPage(opts: ListAlumniOptions): Promise<AlumniListPage> {
  return listAlumniPage(opts);
}

export function getCachedDashboardStats(branchId?: string): Promise<DashboardStats> {
  return fetchDashboardStats(branchId);
}

export async function loadSettingsBundle(): Promise<SettingsResponseDto> {
  let settings = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    settings = await prisma.academySettings.create({
      data: { id: SETTINGS_ID },
    });
  }

  const paymentPlans = await prisma.paymentPlan.findMany({
    include: paymentPlanInclude,
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });

  const sessionSmsTemplates = await listSessionSmsTemplates();
  const registrationSkinColors = await listRegistrationSkinColors();
  const registrationModelingInterests = await listRegistrationModelingInterests();
  const registrationEyeColors = await listRegistrationEyeColors();
  const registrationHairColors = await listRegistrationHairColors();

  return {
    settings: toAcademySettingsDto(settings),
    paymentPlans: paymentPlans.map(toPaymentPlanDto),
    sessionSmsTemplates,
    registrationSkinColors,
    registrationModelingInterests,
    registrationEyeColors,
    registrationHairColors,
  };
}

export function getCachedSettings(): Promise<SettingsResponseDto> {
  return loadSettingsBundle();
}

export type { BranchDetail, BranchListPage, BranchListQuery, BranchPickerItem };
export type { BatchDetail, BatchListPage, BatchListQuery };
