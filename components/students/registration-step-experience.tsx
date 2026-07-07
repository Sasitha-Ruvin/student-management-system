"use client";

import { UnderlineField } from "@/components/ui/underline-field";
import { useRegistrationOptions } from "@/hooks/use-registration-options";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

export function RegistrationStepExperience() {
  const s = useRegistrationWizardStore();
  const { modelingInterests, loading, error } = useRegistrationOptions();

  function toggleInterest(id: string) {
    const next = s.modelingInterestIds.includes(id)
      ? s.modelingInterestIds.filter((x) => x !== id)
      : [...s.modelingInterestIds, id];
    s.setField("modelingInterestIds", next);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="font-headline text-xl text-primary-900">Experience & Skills</h2>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-neutral-600 uppercase">
          Talents & special skills
        </label>
        <textarea
          value={s.talents}
          onChange={(e) => s.setField("talents", e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-sm focus:border-primary-900 focus:outline-none"
          placeholder="e.g. dancing, acting, languages spoken…"
        />
        {s.fieldErrors.talents ? (
          <p className="mt-1 text-xs text-destructive">{s.fieldErrors.talents}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-3 text-xs font-medium tracking-wide text-neutral-600 uppercase">
          Modeling interests
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading interests…</p>
          ) : null}
          {modelingInterests.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-secondary-300/60 bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={s.modelingInterestIds.includes(option.id)}
                onChange={() => toggleInterest(option.id)}
                className="size-4 rounded border-secondary-400"
              />
              {option.label}
            </label>
          ))}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        ) : null}
        {s.fieldErrors.modelingInterestIds ? (
          <p className="mt-1 text-xs text-destructive">{s.fieldErrors.modelingInterestIds}</p>
        ) : null}
      </div>
    </div>
  );
}
