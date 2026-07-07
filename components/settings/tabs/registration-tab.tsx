"use client";

import { RegistrationOptionsSection } from "@/components/settings/registration-options-section";
import type {
  CreateRegistrationOptionBody,
  RegistrationOptionDto,
} from "@/types/api/settings";

type RegistrationTabProps = {
  skinColors: RegistrationOptionDto[];
  eyeColors: RegistrationOptionDto[];
  hairColors: RegistrationOptionDto[];
  modelingInterests: RegistrationOptionDto[];
  onCreateSkinColor: (body: CreateRegistrationOptionBody) => Promise<unknown>;
  onUpdateSkinColor: (
    id: string,
    body: { label?: string; isActive?: boolean },
  ) => Promise<unknown>;
  onDeleteSkinColor: (id: string) => Promise<unknown>;
  onCreateEyeColor: (body: CreateRegistrationOptionBody) => Promise<unknown>;
  onUpdateEyeColor: (
    id: string,
    body: { label?: string; isActive?: boolean },
  ) => Promise<unknown>;
  onDeleteEyeColor: (id: string) => Promise<unknown>;
  onCreateHairColor: (body: CreateRegistrationOptionBody) => Promise<unknown>;
  onUpdateHairColor: (
    id: string,
    body: { label?: string; isActive?: boolean },
  ) => Promise<unknown>;
  onDeleteHairColor: (id: string) => Promise<unknown>;
  onCreateModelingInterest: (body: CreateRegistrationOptionBody) => Promise<unknown>;
  onUpdateModelingInterest: (
    id: string,
    body: { label?: string; isActive?: boolean },
  ) => Promise<unknown>;
  onDeleteModelingInterest: (id: string) => Promise<unknown>;
};

export function RegistrationTab(props: RegistrationTabProps) {
  return <RegistrationOptionsSection {...props} />;
}
