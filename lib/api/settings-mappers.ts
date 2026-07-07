import type {
  AcademySettings,
  PaymentPlan,
  PaymentPlanLineItem,
} from "@/app/generated/prisma";
import { computeOneTimePrice } from "@/lib/payments/payment-plan-utils";
import { academyLogoProxyUrl } from "@/lib/storage/proxy-urls";
import type {
  AcademySettingsDto,
  PaymentPlanDto,
  PaymentPlanLineItemDto,
} from "@/types/api/settings";

export const paymentPlanInclude = {
  lineItems: { orderBy: { order: "asc" as const } },
};

export type PaymentPlanWithLineItems = PaymentPlan & {
  lineItems: PaymentPlanLineItem[];
};

export function toPaymentPlanLineItemDto(
  item: PaymentPlanLineItem,
): PaymentPlanLineItemDto {
  return {
    id: item.id,
    label: item.label,
    amount: Number(item.amount),
    order: item.order,
  };
}

export function toPaymentPlanDto(plan: PaymentPlanWithLineItems): PaymentPlanDto {
  const courseFee = Number(plan.courseFee);
  const oneTimeDiscountAmount = Number(plan.oneTimeDiscountAmount);

  return {
    id: plan.id,
    name: plan.name,
    isDefault: plan.isDefault,
    isActive: plan.isActive,
    registrationFee: Number(plan.registrationFee),
    courseFee,
    oneTimeDiscountAmount,
    oneTimePrice: computeOneTimePrice(courseFee, oneTimeDiscountAmount),
    sortOrder: plan.sortOrder,
    lineItems: plan.lineItems.map(toPaymentPlanLineItemDto),
  };
}

export function toAcademySettingsDto(
  settings: AcademySettings,
): AcademySettingsDto {
  return {
    id: settings.id,
    academyName: settings.academyName,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    currency: settings.currency,
    timezone: settings.timezone,
    defaultRegistrationFee: Number(settings.defaultRegistrationFee),
    defaultCourseFee: Number(settings.defaultCourseFee),
    logoUrl: academyLogoProxyUrl(settings.logoUrl),
    invoiceHeader: settings.invoiceHeader,
    invoiceFooter: settings.invoiceFooter,
    invoiceTerms: settings.invoiceTerms,
    invoiceNumberPrefix: settings.invoiceNumberPrefix,
    invoicePaymentMethodLabel: settings.invoicePaymentMethodLabel,
    invoiceBankName: settings.invoiceBankName,
    invoiceBankAccountNumber: settings.invoiceBankAccountNumber,
    invoiceBankAccountName: settings.invoiceBankAccountName,
    invoiceBankBranch: settings.invoiceBankBranch,
    overdueChargeEnabled: settings.overdueChargeEnabled,
    overdueChargeAmount: Number(settings.overdueChargeAmount),
    overdueChargeEnabledSince:
      settings.overdueChargeEnabledSince?.toISOString() ?? null,
    attendanceWindowBeforeMinutes: settings.attendanceWindowBeforeMinutes,
    attendanceWindowAfterMinutes: settings.attendanceWindowAfterMinutes,
    attendancePinLength: settings.attendancePinLength,
    notificationLookaheadDays: settings.notificationLookaheadDays,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
