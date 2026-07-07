"use client";

import { useState } from "react";

import { SettingsPageSkeleton } from "@/components/ui/loading-state";
import type { SettingsTabId } from "@/config/settings-tabs";
import { useSettings } from "@/hooks/use-settings";

import { SettingsHeader } from "./settings-header";
import { SettingsPanelWrapper } from "./settings-panel";
import { SettingsTabs } from "./settings-tabs";
import { AcademyTab } from "./tabs/academy-tab";
import { BrandingTab } from "./tabs/branding-tab";
import { InvoiceTab } from "./tabs/invoice-tab";
import { NotificationsTab } from "./tabs/notifications-tab";
import { PaymentStructureTab } from "./tabs/payment-structure-tab";
import { RegistrationTab } from "./tabs/registration-tab";
import { ProfileSecurityTab } from "./tabs/profile-security-tab";

const tabTitles: Record<SettingsTabId, string> = {
  academy: "Academy",
  invoice: "Invoice Template",
  branding: "Branding",
  notifications: "Notifications",
  payment: "Payment Structure",
  registration: "Registration Options",
  profile: "Profile & Security",
};

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("payment");
  const {
    settings,
    paymentPlans,
    isLoading,
    error,
    sessionSmsTemplates,
    saveSettings,
    addPlan,
    editPlan,
    removePlan,
    addSessionSmsTemplate,
    editSessionSmsTemplate,
    removeSessionSmsTemplate,
    uploadLogoFile,
    deleteLogo,
    registrationSkinColors,
    registrationModelingInterests,
    registrationEyeColors,
    registrationHairColors,
    addRegistrationSkinColor,
    editRegistrationSkinColor,
    removeRegistrationSkinColor,
    addRegistrationEyeColor,
    editRegistrationEyeColor,
    removeRegistrationEyeColor,
    addRegistrationHairColor,
    editRegistrationHairColor,
    removeRegistrationHairColor,
    addRegistrationModelingInterest,
    editRegistrationModelingInterest,
    removeRegistrationModelingInterest,
  } = useSettings();

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  if (error || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">{error ?? "Failed to load settings"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SettingsHeader />
      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <SettingsPanelWrapper panelKey={activeTab} title={tabTitles[activeTab]}>
        {activeTab === "academy" ? (
          <AcademyTab
            settings={settings}
            sessionSmsTemplates={sessionSmsTemplates}
            onSave={async (data) => {
              await saveSettings(data);
            }}
            onCreateSmsTemplate={async (body) => {
              await addSessionSmsTemplate(body);
            }}
            onUpdateSmsTemplate={async (id, body) => {
              await editSessionSmsTemplate(id, body);
            }}
            onDeleteSmsTemplate={async (id) => {
              await removeSessionSmsTemplate(id);
            }}
          />
        ) : null}
        {activeTab === "payment" ? (
          <PaymentStructureTab
            settings={settings}
            onSaveSettings={async (data) => {
              await saveSettings(data);
            }}
            paymentPlans={paymentPlans}
            onSaveDefaultPlan={async (id, body) => editPlan(id, body)}
            onAddPlan={async (data) => {
              await addPlan(data);
            }}
            onEditPlan={async (id, data) => {
              await editPlan(id, data);
            }}
            onDeletePlan={removePlan}
            onTogglePlanActive={async (id, isActive) => {
              await editPlan(id, { isActive });
            }}
          />
        ) : null}
        {activeTab === "branding" ? (
          <BrandingTab
            settings={settings}
            onUpload={async (file) => {
              await uploadLogoFile(file);
            }}
            onRemove={async () => {
              await deleteLogo();
            }}
          />
        ) : null}
        {activeTab === "invoice" ? (
          <InvoiceTab
            settings={settings}
            onSave={async (data) => {
              await saveSettings(data);
            }}
          />
        ) : null}
        {activeTab === "profile" ? <ProfileSecurityTab /> : null}
        {activeTab === "registration" ? (
          <RegistrationTab
            skinColors={registrationSkinColors}
            eyeColors={registrationEyeColors}
            hairColors={registrationHairColors}
            modelingInterests={registrationModelingInterests}
            onCreateSkinColor={addRegistrationSkinColor}
            onUpdateSkinColor={editRegistrationSkinColor}
            onDeleteSkinColor={removeRegistrationSkinColor}
            onCreateEyeColor={addRegistrationEyeColor}
            onUpdateEyeColor={editRegistrationEyeColor}
            onDeleteEyeColor={removeRegistrationEyeColor}
            onCreateHairColor={addRegistrationHairColor}
            onUpdateHairColor={editRegistrationHairColor}
            onDeleteHairColor={removeRegistrationHairColor}
            onCreateModelingInterest={addRegistrationModelingInterest}
            onUpdateModelingInterest={editRegistrationModelingInterest}
            onDeleteModelingInterest={removeRegistrationModelingInterest}
          />
        ) : null}
        {activeTab === "notifications" ? <NotificationsTab /> : null}
      </SettingsPanelWrapper>
    </div>
  );
}
