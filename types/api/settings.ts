export type PaymentPlanLineItemDto = {
  id: string;
  label: string;
  amount: number;
  order: number;
};

export type PaymentPlanDto = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  registrationFee: number;
  courseFee: number;
  oneTimeDiscountAmount: number;
  oneTimePrice: number;
  sortOrder: number;
  lineItems: PaymentPlanLineItemDto[];
};

export type AcademySettingsDto = {
  id: string;
  academyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  defaultRegistrationFee: number;
  defaultCourseFee: number;
  logoUrl: string | null;
  invoiceHeader: string | null;
  invoiceFooter: string | null;
  invoiceTerms: string | null;
  invoiceNumberPrefix: string;
  invoicePaymentMethodLabel: string | null;
  invoiceBankName: string | null;
  invoiceBankAccountNumber: string | null;
  invoiceBankAccountName: string | null;
  invoiceBankBranch: string | null;
  overdueChargeEnabled: boolean;
  overdueChargeAmount: number;
  overdueChargeEnabledSince: string | null;
  attendanceWindowBeforeMinutes: number;
  attendanceWindowAfterMinutes: number;
  attendancePinLength: number;
  notificationLookaheadDays: number;
  updatedAt: string;
};

export type SessionSmsTemplateDto = {
  id: string;
  name: string;
  body: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionSmsTemplateBody = {
  name: string;
  body: string;
  isDefault?: boolean;
};

export type UpdateSessionSmsTemplateBody = {
  name?: string;
  body?: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type SettingsResponseDto = {
  settings: AcademySettingsDto;
  paymentPlans: PaymentPlanDto[];
  sessionSmsTemplates: SessionSmsTemplateDto[];
  registrationSkinColors: RegistrationOptionDto[];
  registrationModelingInterests: RegistrationOptionDto[];
  registrationEyeColors: RegistrationOptionDto[];
  registrationHairColors: RegistrationOptionDto[];
};

export type RegistrationOptionDto = {
  id: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRegistrationOptionBody = {
  label: string;
  isActive?: boolean;
};

export type UpdateRegistrationOptionBody = {
  label?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateSettingsBody = {
  academyName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  currency?: string;
  timezone?: string;
  defaultRegistrationFee?: number;
  defaultCourseFee?: number;
  invoiceHeader?: string | null;
  invoiceFooter?: string | null;
  invoiceTerms?: string | null;
  invoiceNumberPrefix?: string;
  invoicePaymentMethodLabel?: string | null;
  invoiceBankName?: string | null;
  invoiceBankAccountNumber?: string | null;
  invoiceBankAccountName?: string | null;
  invoiceBankBranch?: string | null;
  overdueChargeEnabled?: boolean;
  overdueChargeAmount?: number;
  attendanceWindowBeforeMinutes?: number;
  attendanceWindowAfterMinutes?: number;
  attendancePinLength?: number;
  notificationLookaheadDays?: number;
};

export type PaymentPlanLineItemInput = {
  id?: string;
  label: string;
  amount: number;
  order: number;
};

export type CreatePaymentPlanBody = {
  name?: string;
  isDefault?: boolean;
  isActive?: boolean;
  registrationFee?: number;
  courseFee?: number;
  oneTimeDiscountAmount?: number;
  sortOrder?: number;
  lineItems?: PaymentPlanLineItemInput[];
};

export type UpdatePaymentPlanBody = CreatePaymentPlanBody;

export type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};
