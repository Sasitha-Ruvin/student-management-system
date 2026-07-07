"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import type {
  CreateRegistrationOptionBody,
  RegistrationOptionDto,
} from "@/types/api/settings";

type OptionListProps = {
  title: string;
  options: RegistrationOptionDto[];
  onCreate: (body: CreateRegistrationOptionBody) => Promise<unknown>;
  onUpdate: (id: string, body: { label?: string; isActive?: boolean }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

function OptionList({
  title,
  options,
  onCreate,
  onUpdate,
  onDelete,
}: OptionListProps) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    try {
      await onCreate({ label });
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add option");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
      <h3 className="font-headline text-lg text-primary-900">{title}</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="New option label"
          className="min-h-11 flex-1 rounded-xl border border-secondary-400 bg-white px-3 text-sm"
        />
        <SubmitButton type="button" onClick={() => void handleAdd()}>
          Add
        </SubmitButton>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="space-y-2">
        {options.map((option) => (
          <li
            key={option.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-secondary-300/60 bg-white px-3 py-2 text-sm"
          >
            <span>
              {option.label}
              {option.isDefault ? (
                <span className="ml-2 text-xs text-neutral-500">(default)</span>
              ) : null}
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={option.isActive}
                  disabled={busyId === option.id}
                  onChange={(e) => {
                    setBusyId(option.id);
                    void onUpdate(option.id, { isActive: e.target.checked }).finally(
                      () => setBusyId(null),
                    );
                  }}
                />
                Active
              </label>
              {!option.isDefault ? (
                <button
                  type="button"
                  className="text-xs text-destructive"
                  disabled={busyId === option.id}
                  onClick={() => {
                    if (!confirm(`Delete "${option.label}"?`)) return;
                    setBusyId(option.id);
                    void onDelete(option.id).finally(() => setBusyId(null));
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type RegistrationOptionsSectionProps = {
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

export function RegistrationOptionsSection(props: RegistrationOptionsSectionProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">
        Manage dropdown and checkbox options shown during student registration.
      </p>
      <OptionList
        title="Skin colors"
        options={props.skinColors}
        onCreate={props.onCreateSkinColor}
        onUpdate={props.onUpdateSkinColor}
        onDelete={props.onDeleteSkinColor}
      />
      <OptionList
        title="Eye colors"
        options={props.eyeColors}
        onCreate={props.onCreateEyeColor}
        onUpdate={props.onUpdateEyeColor}
        onDelete={props.onDeleteEyeColor}
      />
      <OptionList
        title="Hair colors"
        options={props.hairColors}
        onCreate={props.onCreateHairColor}
        onUpdate={props.onUpdateHairColor}
        onDelete={props.onDeleteHairColor}
      />
      <OptionList
        title="Modeling interests"
        options={props.modelingInterests}
        onCreate={props.onCreateModelingInterest}
        onUpdate={props.onUpdateModelingInterest}
        onDelete={props.onDeleteModelingInterest}
      />
    </div>
  );
}
