"use client";

import { useEffect, useMemo, useState } from "react";

import { UnderlineSelect } from "@/components/ui/underline-select";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { fetchBatches } from "@/lib/api/batches";
import { filterAdminEnrollableBatches } from "@/lib/batches/admin-enrollable-batches";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";
import type { BatchListItem } from "@/types/api/batch";

const DAY_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];

export function RegistrationStepAssignment() {
  const s = useRegistrationWizardStore();
  const { branches } = useBranchesPicker();
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    void fetchBatches({ status: "all", limit: 100 }, { signal: controller.signal })
      .then((page) => {
        if (!controller.signal.aborted) {
          setBatches(filterAdminEnrollableBatches(page.items));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setBatches([]);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load batches",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const branchOptions = [
    { value: "", label: "No preference" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const sortedBatches = useMemo(() => {
    const preferred = s.preferredBranchId;
    return [...batches].sort((a, b) => {
      if (preferred) {
        if (a.branchId === preferred && b.branchId !== preferred) return -1;
        if (b.branchId === preferred && a.branchId !== preferred) return 1;
      }
      return a.batchCode.localeCompare(b.batchCode);
    });
  }, [batches, s.preferredBranchId]);

  const batchOptions = [
    { value: "", label: loading ? "Loading…" : "Select batch…" },
    ...sortedBatches.map((b) => ({
      value: b.id,
      label: `${b.batchCode} — ${b.branchName} — ${b.startDate.slice(0, 10)} to ${b.endDate.slice(0, 10)} — ${b.enrollmentCount} enrolled`,
    })),
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="font-headline text-xl text-primary-900">Assignment</h2>
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      {sortedBatches.length === 0 && !loading && !loadError ? (
        <p className="text-sm text-destructive">
          No batches available for assignment. Create a batch before registering students.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <UnderlineSelect
          label="Preferred branch"
          value={s.preferredBranchId}
          onChange={(v) => s.setField("preferredBranchId", v)}
          options={branchOptions}
        />
        <UnderlineSelect
          label="Preferred day"
          value={s.preferredDate}
          onChange={(v) => s.setField("preferredDate", v)}
          options={DAY_OPTIONS}
        />
        <UnderlineSelect
          label="Assign to batch"
          value={s.batchId}
          onChange={(v) => s.setField("batchId", v)}
          options={batchOptions}
          disabled={loading || sortedBatches.length === 0}
          error={s.fieldErrors.batchId}
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}
