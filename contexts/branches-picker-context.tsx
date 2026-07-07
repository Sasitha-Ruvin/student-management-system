"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fetchBranchPicker } from "@/lib/api/branches";
import type { BranchPickerItem } from "@/types/api/branch";

type BranchesPickerContextValue = {
  branches: BranchPickerItem[];
  isLoading: boolean;
  reload: () => Promise<void>;
};

const BranchesPickerContext = createContext<BranchesPickerContextValue | null>(
  null,
);

export function BranchesPickerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branches, setBranches] = useState<BranchPickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setBranches(await fetchBranchPicker());
    } catch {
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(
    () => ({ branches, isLoading, reload }),
    [branches, isLoading, reload],
  );

  return (
    <BranchesPickerContext.Provider value={value}>
      {children}
    </BranchesPickerContext.Provider>
  );
}

export function useBranchesPicker() {
  const ctx = useContext(BranchesPickerContext);
  if (!ctx) {
    throw new Error(
      "useBranchesPicker must be used within BranchesPickerProvider",
    );
  }
  return ctx;
}
