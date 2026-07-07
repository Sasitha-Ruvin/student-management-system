"use client";

import { CreatableSelect } from "@/components/ui/creatable-select";
import { UnderlineField } from "@/components/ui/underline-field";
import { UnderlineSelect } from "@/components/ui/underline-select";
import {
  getCityLabelsForProvince,
  getProvinceLabels,
} from "@/lib/locations/sri-lanka";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

const GENDER_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export function RegistrationStepPersonal() {
  const s = useRegistrationWizardStore();

  return (
    <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="font-headline text-xl text-primary-900">Personal Information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <UnderlineField
          label="First name"
          value={s.firstName}
          onChange={(e) => s.setField("firstName", e.target.value)}
          error={s.fieldErrors.firstName}
        />
        <UnderlineField
          label="Last name"
          value={s.lastName}
          onChange={(e) => s.setField("lastName", e.target.value)}
          error={s.fieldErrors.lastName}
        />
        <UnderlineField
          label="Date of birth"
          type="date"
          value={s.dob}
          onChange={(e) => s.setField("dob", e.target.value)}
          error={s.fieldErrors.dob}
        />
        <UnderlineSelect
          label="Gender"
          value={s.gender}
          onChange={(v) => s.setField("gender", v)}
          options={GENDER_OPTIONS}
          error={s.fieldErrors.gender}
        />
        <UnderlineField
          label="Email"
          type="email"
          value={s.email}
          onChange={(e) => s.setField("email", e.target.value)}
          error={s.fieldErrors.email}
          className="sm:col-span-2"
        />
        <UnderlineField
          label="NIC"
          value={s.nic}
          onChange={(e) => s.setField("nic", e.target.value)}
          error={s.fieldErrors.nic}
          className="sm:col-span-2"
        />
      </div>

      <h3 className="font-headline text-lg text-primary-900">Contact Details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <UnderlineField
          label="Phone"
          value={s.contactNumber}
          onChange={(e) => s.setField("contactNumber", e.target.value)}
          error={s.fieldErrors.contactNumber}
        />
        <UnderlineField
          label="WhatsApp"
          value={s.sameAsContact ? s.contactNumber : s.whatsappNumber}
          onChange={(e) => s.setField("whatsappNumber", e.target.value)}
          disabled={s.sameAsContact}
          error={s.fieldErrors.whatsappNumber}
        />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={s.sameAsContact}
            onChange={(e) => s.setField("sameAsContact", e.target.checked)}
            className="size-4 rounded border-secondary-400"
          />
          <span className="text-sm text-neutral-700">Same as phone number</span>
        </label>
        <UnderlineField
          label="Street address (optional)"
          value={s.street}
          onChange={(e) => s.setField("street", e.target.value)}
          error={s.fieldErrors.street}
          className="sm:col-span-2"
        />
        <CreatableSelect
          label="Province"
          optional
          value={s.stateRegion}
          onChange={(value) => s.setField("stateRegion", value)}
          options={getProvinceLabels()}
          strict
          variant="underline"
          placeholder="Select province…"
          aria-label="Province"
        />
        <CreatableSelect
          label="City"
          optional
          value={s.city}
          onChange={(value) => s.setField("city", value)}
          options={getCityLabelsForProvince(s.stateRegion)}
          disabled={!s.stateRegion}
          variant="underline"
          placeholder={
            s.stateRegion ? "Select or type city…" : "Select a province first"
          }
          error={s.fieldErrors.city}
          aria-label="City"
        />
        <UnderlineField
          label="Zip code"
          value={s.zipCode}
          onChange={(e) => s.setField("zipCode", e.target.value)}
        />
      </div>
    </div>
  );
}
