import { adminFetch } from "@/lib/api/admin-fetch";
import type {
  CreateRegistrationOptionBody,
  RegistrationOptionDto,
} from "@/types/api/settings";

async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Request failed");
  }
  return json.data as T;
}

export type RegistrationOptionsResponse = {
  skinColors: RegistrationOptionDto[];
  modelingInterests: RegistrationOptionDto[];
  eyeColors: RegistrationOptionDto[];
  hairColors: RegistrationOptionDto[];
};

export async function fetchRegistrationOptions(): Promise<RegistrationOptionsResponse> {
  const res = await adminFetch("/api/registration/options", {
    cache: "no-store",
  });
  return parseResponse<RegistrationOptionsResponse>(res);
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
