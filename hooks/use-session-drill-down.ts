"use client";

import { useCallback, useEffect, useState } from "react";

import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { useBranchFilter } from "@/stores/branch-filter-store";

export type SessionDrillStep = "branches" | "batches" | "sessions";

function initialStep(sidebarBranchId: string | null): SessionDrillStep {
  return sidebarBranchId ? "batches" : "branches";
}

export function useSessionDrillDown() {
  const { selectedBranchId: sidebarBranchId } = useBranchFilter();
  const { branches: pickerBranches } = useBranchesPicker();

  const [step, setStep] = useState<SessionDrillStep>(() =>
    initialStep(sidebarBranchId),
  );
  const [branchId, setBranchId] = useState<string | null>(sidebarBranchId);
  const [branchLabel, setBranchLabel] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchLabel, setBatchLabel] = useState<string | null>(null);

  const resolveBranchLabel = useCallback(
    (id: string, fallback?: string) => {
      if (fallback) return fallback;
      return pickerBranches.find((b) => b.id === id)?.name ?? "Branch";
    },
    [pickerBranches],
  );

  useEffect(() => {
    if (sidebarBranchId) {
      setBranchId(sidebarBranchId);
      setBranchLabel(resolveBranchLabel(sidebarBranchId));
      setBatchId(null);
      setBatchLabel(null);
      setStep("batches");
    } else {
      setBranchId(null);
      setBranchLabel(null);
      setBatchId(null);
      setBatchLabel(null);
      setStep("branches");
    }
  }, [sidebarBranchId, resolveBranchLabel]);

  const selectBranch = useCallback(
    (id: string, label: string) => {
      setBranchId(id);
      setBranchLabel(label);
      setBatchId(null);
      setBatchLabel(null);
      setStep("batches");
    },
    [],
  );

  const selectBatch = useCallback((id: string, label: string) => {
    setBatchId(id);
    setBatchLabel(label);
    setStep("sessions");
  }, []);

  const goToBranches = useCallback(() => {
    setBatchId(null);
    setBatchLabel(null);
    if (sidebarBranchId) {
      setBranchId(sidebarBranchId);
      setBranchLabel(resolveBranchLabel(sidebarBranchId));
      setStep("batches");
    } else {
      setBranchId(null);
      setBranchLabel(null);
      setStep("branches");
    }
  }, [sidebarBranchId, resolveBranchLabel]);

  const goToBatches = useCallback(() => {
    setBatchId(null);
    setBatchLabel(null);
    if (branchId) {
      setStep("batches");
    } else {
      setStep("branches");
    }
  }, [branchId]);

  return {
    step,
    branchId,
    branchLabel,
    batchId,
    batchLabel,
    selectBranch,
    selectBatch,
    goToBranches,
    goToBatches,
    scheduleDefaultBranchId: branchId ?? sidebarBranchId ?? undefined,
  };
}
