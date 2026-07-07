import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  AcademySettingsDto,
  CreatePaymentPlanBody,
  CreateRegistrationOptionBody,
  CreateSessionSmsTemplateBody,
  PaymentPlanDto,
  RegistrationOptionDto,
  SessionSmsTemplateDto,
  SettingsResponseDto,
  UpdatePaymentPlanBody,
  UpdateRegistrationOptionBody,
  UpdateSessionSmsTemplateBody,
  UpdateSettingsBody,
} from "@/types/api/settings";

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as T;
}

export async function fetchSettings(): Promise<SettingsResponseDto> {
  const res = await adminFetch("/api/settings", {
    cache: "no-store",
  });
  return parseResponse<SettingsResponseDto>(res);
}

export async function fetchSessionSmsTemplates(): Promise<SessionSmsTemplateDto[]> {
  const res = await adminFetch("/api/settings/session-sms-templates", {
    cache: "no-store",
  });
  return parseResponse<SessionSmsTemplateDto[]>(res);
}

export async function updateSettings(
  body: UpdateSettingsBody,
): Promise<AcademySettingsDto> {
  const res = await adminFetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<AcademySettingsDto>(res);
}

export async function createPaymentPlan(
  body: CreatePaymentPlanBody,
): Promise<PaymentPlanDto> {
  const res = await adminFetch("/api/settings/payment-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<PaymentPlanDto>(res);
}

export async function updatePaymentPlan(
  id: string,
  body: UpdatePaymentPlanBody,
): Promise<PaymentPlanDto> {
  const res = await adminFetch(`/api/settings/payment-plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse<PaymentPlanDto>(res);
}

export async function deletePaymentPlan(id: string): Promise<void> {
  const res = await adminFetch(`/api/settings/payment-plans/${id}`, {
    method: "DELETE",
  });
  await parseResponse<{ success: boolean }>(res);
}

export async function uploadLogo(file: File): Promise<AcademySettingsDto> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await adminFetch("/api/settings/logo", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });
  return parseResponse<AcademySettingsDto>(res);
}

export async function removeLogo(): Promise<AcademySettingsDto> {
  const res = await adminFetch("/api/settings/logo", {
    method: "DELETE",
    cache: "no-store",
  });
  return parseResponse<AcademySettingsDto>(res);
}

export async function createSessionSmsTemplate(
  body: CreateSessionSmsTemplateBody,
): Promise<SessionSmsTemplateDto> {
  const res = await adminFetch("/api/settings/session-sms-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<SessionSmsTemplateDto>(res);
}

export async function updateSessionSmsTemplate(
  id: string,
  body: UpdateSessionSmsTemplateBody,
): Promise<SessionSmsTemplateDto> {
  const res = await adminFetch(`/api/settings/session-sms-templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<SessionSmsTemplateDto>(res);
}

export async function deleteSessionSmsTemplate(id: string): Promise<void> {
  const res = await adminFetch(`/api/settings/session-sms-templates/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await parseResponse<{ message: string }>(res);
}

export async function createRegistrationSkinColor(
  body: CreateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch("/api/settings/registration-skin-colors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function updateRegistrationSkinColor(
  id: string,
  body: UpdateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch(`/api/settings/registration-skin-colors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function deleteRegistrationSkinColor(id: string): Promise<void> {
  const res = await adminFetch(`/api/settings/registration-skin-colors/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await parseResponse<{ message: string }>(res);
}

export async function createRegistrationModelingInterest(
  body: CreateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch("/api/settings/registration-modeling-interests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function updateRegistrationModelingInterest(
  id: string,
  body: UpdateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch(
    `/api/settings/registration-modeling-interests/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return parseResponse<RegistrationOptionDto>(res);
}

export async function deleteRegistrationModelingInterest(
  id: string,
): Promise<void> {
  const res = await adminFetch(
    `/api/settings/registration-modeling-interests/${id}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
  await parseResponse<{ message: string }>(res);
}

export async function createRegistrationEyeColor(
  body: CreateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch("/api/settings/registration-eye-colors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function updateRegistrationEyeColor(
  id: string,
  body: UpdateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch(`/api/settings/registration-eye-colors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function deleteRegistrationEyeColor(id: string): Promise<void> {
  const res = await adminFetch(`/api/settings/registration-eye-colors/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await parseResponse<{ message: string }>(res);
}

export async function createRegistrationHairColor(
  body: CreateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch("/api/settings/registration-hair-colors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function updateRegistrationHairColor(
  id: string,
  body: UpdateRegistrationOptionBody,
): Promise<RegistrationOptionDto> {
  const res = await adminFetch(`/api/settings/registration-hair-colors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionDto>(res);
}

export async function deleteRegistrationHairColor(id: string): Promise<void> {
  const res = await adminFetch(`/api/settings/registration-hair-colors/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await parseResponse<{ message: string }>(res);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await adminFetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await parseResponse<{ success: boolean }>(res);
}
