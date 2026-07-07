"use client";

import { FormEvent, useEffect, useState } from "react";

import { ClassDayPicker } from "@/components/branches/class-day-picker";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { validateClassDays } from "@/lib/branches/class-day-utils";
import type { CreateBranchClassDayInput } from "@/types/api/branch";

type AddBranchModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    location: string;
    classDays: CreateBranchClassDayInput[];
  }) => Promise<void>;
};

export function AddBranchModal({ open, onClose, onSubmit }: AddBranchModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([6]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setLocation("");
    setSelectedDays([6]);
    setError(null);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const classDays = selectedDays.map((dayOfWeek) => ({ dayOfWeek }));
      const validationError = validateClassDays(classDays);
      if (validationError) throw new Error(validationError);

      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        classDays,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 text-base outline-none focus:border-primary-900 sm:text-sm";

  return (
    <Modal open={open} onClose={onClose} title="Add Branch">
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Branch name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="New York"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-neutral-700">Location</span>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
            placeholder="123 Fashion Ave, New York, NY"
          />
        </label>

        <div className="space-y-3 rounded-2xl border border-secondary-300/60 bg-secondary-100/30 p-4">
          <div>
            <h3 className="font-headline text-base text-primary-900">Class days</h3>
            <p className="mt-1 text-xs text-neutral-600">
              Which days this branch runs classes (e.g. Saturday and Sunday).
              Session times are set when batches and sessions are created.
            </p>
          </div>
          <ClassDayPicker
            selectedDays={selectedDays}
            onChange={setSelectedDays}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <SubmitButton
          loading={isSubmitting}
          loadingText="Creating…"
          className="w-full"
        >
          Create Branch
        </SubmitButton>
      </form>
    </Modal>
  );
}
