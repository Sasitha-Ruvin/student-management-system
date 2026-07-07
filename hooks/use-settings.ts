"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createPaymentPlan,
  createRegistrationEyeColor,
  createRegistrationHairColor,
  createRegistrationModelingInterest,
  createRegistrationSkinColor,
  createSessionSmsTemplate,
  deletePaymentPlan,
  deleteRegistrationEyeColor,
  deleteRegistrationHairColor,
  deleteRegistrationModelingInterest,
  deleteRegistrationSkinColor,
  deleteSessionSmsTemplate,
  fetchSettings,
  removeLogo,
  updatePaymentPlan,
  updateRegistrationEyeColor,
  updateRegistrationHairColor,
  updateRegistrationModelingInterest,
  updateRegistrationSkinColor,
  updateSessionSmsTemplate,
  updateSettings,
  uploadLogo,
} from "@/lib/api/settings";
import type {
  AcademySettingsDto,
  CreatePaymentPlanBody,
  CreateRegistrationOptionBody,
  CreateSessionSmsTemplateBody,
  PaymentPlanDto,
  RegistrationOptionDto,
  SessionSmsTemplateDto,
  UpdatePaymentPlanBody,
  UpdateRegistrationOptionBody,
  UpdateSessionSmsTemplateBody,
  UpdateSettingsBody,
} from "@/types/api/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AcademySettingsDto | null>(null);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanDto[]>([]);
  const [sessionSmsTemplates, setSessionSmsTemplates] = useState<
    SessionSmsTemplateDto[]
  >([]);
  const [registrationSkinColors, setRegistrationSkinColors] = useState<
    RegistrationOptionDto[]
  >([]);
  const [registrationModelingInterests, setRegistrationModelingInterests] =
    useState<RegistrationOptionDto[]>([]);
  const [registrationEyeColors, setRegistrationEyeColors] = useState<
    RegistrationOptionDto[]
  >([]);
  const [registrationHairColors, setRegistrationHairColors] = useState<
    RegistrationOptionDto[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSettings();
      setSettings(data.settings);
      setPaymentPlans(data.paymentPlans);
      setSessionSmsTemplates(data.sessionSmsTemplates);
      setRegistrationSkinColors(data.registrationSkinColors);
      setRegistrationModelingInterests(data.registrationModelingInterests);
      setRegistrationEyeColors(data.registrationEyeColors);
      setRegistrationHairColors(data.registrationHairColors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(body: UpdateSettingsBody) {
    const updated = await updateSettings(body);
    setSettings(updated);
    return updated;
  }

  async function addPlan(body: CreatePaymentPlanBody) {
    const created = await createPaymentPlan(body);
    setPaymentPlans((prev) => [...prev, created]);
    return created;
  }

  async function editPlan(id: string, body: UpdatePaymentPlanBody) {
    const updated = await updatePaymentPlan(id, body);
    setPaymentPlans((prev) =>
      prev.map((p) => {
        if (p.id === id) return updated;
        if (updated.isDefault && p.isDefault) {
          return { ...p, isDefault: false };
        }
        return p;
      }),
    );
    if (updated.isDefault) {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              defaultRegistrationFee: updated.registrationFee,
              defaultCourseFee: updated.courseFee,
            }
          : prev,
      );
    }
    return updated;
  }

  async function removePlan(id: string) {
    await deletePaymentPlan(id);
    setPaymentPlans((prev) => prev.filter((p) => p.id !== id));
  }

  async function uploadLogoFile(file: File) {
    const updated = await uploadLogo(file);
    setSettings(updated);
    return updated;
  }

  async function deleteLogo() {
    const updated = await removeLogo();
    setSettings(updated);
    return updated;
  }

  async function addSessionSmsTemplate(body: CreateSessionSmsTemplateBody) {
    const created = await createSessionSmsTemplate(body);
    await load();
    return created;
  }

  async function editSessionSmsTemplate(
    id: string,
    body: UpdateSessionSmsTemplateBody,
  ) {
    const updated = await updateSessionSmsTemplate(id, body);
    await load();
    return updated;
  }

  async function removeSessionSmsTemplate(id: string) {
    await deleteSessionSmsTemplate(id);
    await load();
  }

  async function addRegistrationSkinColor(body: CreateRegistrationOptionBody) {
    const created = await createRegistrationSkinColor(body);
    await load();
    return created;
  }

  async function editRegistrationSkinColor(
    id: string,
    body: UpdateRegistrationOptionBody,
  ) {
    const updated = await updateRegistrationSkinColor(id, body);
    await load();
    return updated;
  }

  async function removeRegistrationSkinColor(id: string) {
    await deleteRegistrationSkinColor(id);
    await load();
  }

  async function addRegistrationModelingInterest(
    body: CreateRegistrationOptionBody,
  ) {
    const created = await createRegistrationModelingInterest(body);
    await load();
    return created;
  }

  async function editRegistrationModelingInterest(
    id: string,
    body: UpdateRegistrationOptionBody,
  ) {
    const updated = await updateRegistrationModelingInterest(id, body);
    await load();
    return updated;
  }

  async function removeRegistrationModelingInterest(id: string) {
    await deleteRegistrationModelingInterest(id);
    await load();
  }

  async function addRegistrationEyeColor(body: CreateRegistrationOptionBody) {
    const created = await createRegistrationEyeColor(body);
    await load();
    return created;
  }

  async function editRegistrationEyeColor(
    id: string,
    body: UpdateRegistrationOptionBody,
  ) {
    const updated = await updateRegistrationEyeColor(id, body);
    await load();
    return updated;
  }

  async function removeRegistrationEyeColor(id: string) {
    await deleteRegistrationEyeColor(id);
    await load();
  }

  async function addRegistrationHairColor(body: CreateRegistrationOptionBody) {
    const created = await createRegistrationHairColor(body);
    await load();
    return created;
  }

  async function editRegistrationHairColor(
    id: string,
    body: UpdateRegistrationOptionBody,
  ) {
    const updated = await updateRegistrationHairColor(id, body);
    await load();
    return updated;
  }

  async function removeRegistrationHairColor(id: string) {
    await deleteRegistrationHairColor(id);
    await load();
  }

  return {
    settings,
    paymentPlans,
    sessionSmsTemplates,
    registrationSkinColors,
    registrationModelingInterests,
    registrationEyeColors,
    registrationHairColors,
    isLoading,
    error,
    reload: load,
    saveSettings,
    addPlan,
    editPlan,
    removePlan,
    addSessionSmsTemplate,
    editSessionSmsTemplate,
    removeSessionSmsTemplate,
    addRegistrationSkinColor,
    editRegistrationSkinColor,
    removeRegistrationSkinColor,
    addRegistrationModelingInterest,
    editRegistrationModelingInterest,
    removeRegistrationModelingInterest,
    addRegistrationEyeColor,
    editRegistrationEyeColor,
    removeRegistrationEyeColor,
    addRegistrationHairColor,
    editRegistrationHairColor,
    removeRegistrationHairColor,
    uploadLogoFile,
    deleteLogo,
    setSettings,
    setPaymentPlans,
  };
}
