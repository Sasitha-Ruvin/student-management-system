import { NextResponse } from "next/server";

import { getCachedSettings } from "@/lib/api/cached-queries";
import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { toAcademySettingsDto } from "@/lib/api/settings-mappers";
import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import type {
  SettingsResponseDto,
  UpdateSettingsBody,
} from "@/types/api/settings";

const SETTINGS_ID = "default";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const data: SettingsResponseDto = await getCachedSettings();

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: UpdateSettingsBody;
  try {
    body = (await request.json()) as UpdateSettingsBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    academyName,
    contactEmail,
    contactPhone,
    address,
    currency,
    timezone,
    defaultRegistrationFee,
    defaultCourseFee,
    invoiceHeader,
    invoiceFooter,
    invoiceTerms,
    invoiceNumberPrefix,
    invoicePaymentMethodLabel,
    invoiceBankName,
    invoiceBankAccountNumber,
    invoiceBankAccountName,
    invoiceBankBranch,
    overdueChargeEnabled,
    overdueChargeAmount,
    attendanceWindowBeforeMinutes,
    attendanceWindowAfterMinutes,
    attendancePinLength,
    notificationLookaheadDays,
  } = body;

  if (
    academyName === undefined &&
    contactEmail === undefined &&
    contactPhone === undefined &&
    address === undefined &&
    currency === undefined &&
    timezone === undefined &&
    defaultRegistrationFee === undefined &&
    defaultCourseFee === undefined &&
    invoiceHeader === undefined &&
    invoiceFooter === undefined &&
    invoiceTerms === undefined &&
    invoiceNumberPrefix === undefined &&
    invoicePaymentMethodLabel === undefined &&
    invoiceBankName === undefined &&
    invoiceBankAccountNumber === undefined &&
    invoiceBankAccountName === undefined &&
    invoiceBankBranch === undefined &&
    overdueChargeEnabled === undefined &&
    overdueChargeAmount === undefined &&
    attendanceWindowBeforeMinutes === undefined &&
    attendanceWindowAfterMinutes === undefined &&
    attendancePinLength === undefined &&
    notificationLookaheadDays === undefined
  ) {
    return NextResponse.json(
      { error: "At least one field is required" },
      { status: 400 },
    );
  }

  if (
    defaultRegistrationFee !== undefined &&
    defaultRegistrationFee < 0
  ) {
    return NextResponse.json(
      { error: "defaultRegistrationFee must be non-negative" },
      { status: 400 },
    );
  }

  if (defaultCourseFee !== undefined && defaultCourseFee < 0) {
    return NextResponse.json(
      { error: "defaultCourseFee must be non-negative" },
      { status: 400 },
    );
  }

  if (overdueChargeAmount !== undefined && overdueChargeAmount < 0) {
    return NextResponse.json(
      { error: "overdueChargeAmount must be non-negative" },
      { status: 400 },
    );
  }

  if (
    attendanceWindowBeforeMinutes !== undefined &&
    attendanceWindowBeforeMinutes < 0
  ) {
    return NextResponse.json(
      { error: "attendanceWindowBeforeMinutes must be non-negative" },
      { status: 400 },
    );
  }

  if (
    attendanceWindowAfterMinutes !== undefined &&
    attendanceWindowAfterMinutes < 0
  ) {
    return NextResponse.json(
      { error: "attendanceWindowAfterMinutes must be non-negative" },
      { status: 400 },
    );
  }

  if (
    attendancePinLength !== undefined &&
    (attendancePinLength < 4 || attendancePinLength > 8)
  ) {
    return NextResponse.json(
      { error: "attendancePinLength must be between 4 and 8" },
      { status: 400 },
    );
  }

  if (
    notificationLookaheadDays !== undefined &&
    notificationLookaheadDays < 1
  ) {
    return NextResponse.json(
      { error: "notificationLookaheadDays must be at least 1" },
      { status: 400 },
    );
  }

  const existing = await prisma.academySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { overdueChargeEnabled: true, overdueChargeEnabledSince: true },
  });

  const enablingOverdue =
    overdueChargeEnabled === true &&
    !existing?.overdueChargeEnabled;

  const updated = await prisma.academySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {
      ...(academyName !== undefined && { academyName: academyName.trim() }),
      ...(contactEmail !== undefined && {
        contactEmail: contactEmail?.trim() || null,
      }),
      ...(contactPhone !== undefined && {
        contactPhone: contactPhone?.trim() || null,
      }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(currency !== undefined && { currency: currency.trim() }),
      ...(timezone !== undefined && { timezone: timezone.trim() }),
      ...(defaultRegistrationFee !== undefined && {
        defaultRegistrationFee,
      }),
      ...(defaultCourseFee !== undefined && { defaultCourseFee }),
      ...(invoiceHeader !== undefined && {
        invoiceHeader: invoiceHeader?.trim() || null,
      }),
      ...(invoiceFooter !== undefined && {
        invoiceFooter: invoiceFooter?.trim() || null,
      }),
      ...(invoiceTerms !== undefined && {
        invoiceTerms: invoiceTerms?.trim() || null,
      }),
      ...(invoiceNumberPrefix !== undefined && {
        invoiceNumberPrefix: invoiceNumberPrefix.trim(),
      }),
      ...(invoicePaymentMethodLabel !== undefined && {
        invoicePaymentMethodLabel:
          invoicePaymentMethodLabel?.trim() || null,
      }),
      ...(invoiceBankName !== undefined && {
        invoiceBankName: invoiceBankName?.trim() || null,
      }),
      ...(invoiceBankAccountNumber !== undefined && {
        invoiceBankAccountNumber:
          invoiceBankAccountNumber?.trim() || null,
      }),
      ...(invoiceBankAccountName !== undefined && {
        invoiceBankAccountName:
          invoiceBankAccountName?.trim() || null,
      }),
      ...(invoiceBankBranch !== undefined && {
        invoiceBankBranch: invoiceBankBranch?.trim() || null,
      }),
      ...(overdueChargeEnabled !== undefined && {
        overdueChargeEnabled,
      }),
      ...(overdueChargeAmount !== undefined && {
        overdueChargeAmount,
      }),
      ...(attendanceWindowBeforeMinutes !== undefined && {
        attendanceWindowBeforeMinutes,
      }),
      ...(attendanceWindowAfterMinutes !== undefined && {
        attendanceWindowAfterMinutes,
      }),
      ...(attendancePinLength !== undefined && {
        attendancePinLength,
      }),
      ...(notificationLookaheadDays !== undefined && {
        notificationLookaheadDays,
      }),
      ...(enablingOverdue && {
        overdueChargeEnabledSince: new Date(),
      }),
    },
  });

  invalidateSettings();

  return NextResponse.json({ data: toAcademySettingsDto(updated) });
}
