"use client";

import { CreatableSelect } from "@/components/ui/creatable-select";
import { UnderlineField } from "@/components/ui/underline-field";
import { Select } from "@/components/ui/select";
import { useRegistrationOptions } from "@/hooks/use-registration-options";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

export function RegistrationStepMeasurements() {
  const s = useRegistrationWizardStore();
  const {
    skinColors,
    eyeColors,
    hairColors,
    loading,
    error,
    addEyeColorOption,
    addHairColorOption,
  } = useRegistrationOptions();

  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
        <h2 className="font-headline text-xl text-primary-900">Measurements</h2>
        {s.warnings.length > 0 ? (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {s.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <UnderlineField
            label="Height (cm)"
            type="number"
            min={50}
            max={300}
            value={s.height}
            onChange={(e) => s.setField("height", e.target.value)}
            error={s.fieldErrors.height}
          />
          <UnderlineField
            label="Weight (kg)"
            type="number"
            min={10}
            max={500}
            value={s.weight}
            onChange={(e) => s.setField("weight", e.target.value)}
            error={s.fieldErrors.weight}
          />
          <UnderlineField
            label="Age"
            type="number"
            min={0}
            value={s.age}
            onChange={(e) => s.setField("age", e.target.value)}
            error={s.fieldErrors.age}
            hint={s.dob ? "Auto-calculated from date of birth" : undefined}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UnderlineField
            label="Chest (inches)"
            type="number"
            min={20}
            max={80}
            value={s.chest}
            onChange={(e) => s.setField("chest", e.target.value)}
            error={s.fieldErrors.chest}
          />
          <UnderlineField
            label="Shoulder (inches)"
            type="number"
            min={20}
            max={80}
            value={s.shoulder}
            onChange={(e) => s.setField("shoulder", e.target.value)}
            error={s.fieldErrors.shoulder}
          />
          <UnderlineField
            label="Waist (inches)"
            type="number"
            min={20}
            max={80}
            value={s.waist}
            onChange={(e) => s.setField("waist", e.target.value)}
            error={s.fieldErrors.waist}
          />
          <UnderlineField
            label="Shoe size (UK)"
            value={s.shoeSize}
            onChange={(e) => s.setField("shoeSize", e.target.value)}
            error={s.fieldErrors.shoeSize}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
        <h2 className="font-headline text-xl text-primary-900">Physical Features</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium tracking-wide text-neutral-600 uppercase">
              Skin color <span className="normal-case text-neutral-500">(optional)</span>
            </label>
            <Select
              value={s.skinColorOptionId}
              onChange={(value) => s.setField("skinColorOptionId", value)}
              disabled={loading}
              placeholder={loading ? "Loading…" : "Not specified"}
              options={[
                { value: "", label: "Not specified" },
                ...skinColors.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
            {error ? (
              <p className="mt-1 text-xs text-destructive">{error}</p>
            ) : null}
            {s.fieldErrors.skinColorOptionId ? (
              <p className="mt-1 text-xs text-destructive">{s.fieldErrors.skinColorOptionId}</p>
            ) : null}
          </div>
          <CreatableSelect
            label="Eye color"
            optional
            value={s.eyeColor}
            onChange={(value) => s.setField("eyeColor", value)}
            options={eyeColors.map((option) => option.label)}
            onCreateOption={addEyeColorOption}
            loading={loading}
            disabled={loading}
            variant="underline"
            error={s.fieldErrors.eyeColor}
            aria-label="Eye color"
          />
          <CreatableSelect
            label="Hair color"
            optional
            value={s.hairColor}
            onChange={(value) => s.setField("hairColor", value)}
            options={hairColors.map((option) => option.label)}
            onCreateOption={addHairColorOption}
            loading={loading}
            disabled={loading}
            variant="underline"
            error={s.fieldErrors.hairColor}
            aria-label="Hair color"
          />
        </div>
      </div>
    </div>
  );
}
