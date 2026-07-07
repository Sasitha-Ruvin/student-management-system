import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

const STORAGE_KEY = "wma-selected-branch-id";

/** Reads legacy plain-string values ("all" or branch id) from sessionStorage. */
const branchFilterStorage: StateStorage = {
  getItem: (name) => {
    const raw = sessionStorage.getItem(name);
    if (!raw) return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      const selectedBranchId = raw === "all" ? null : raw;
      return JSON.stringify({
        state: { selectedBranchId },
        version: 0,
      });
    }
  },
  setItem: (name, value) => sessionStorage.setItem(name, value),
  removeItem: (name) => sessionStorage.removeItem(name),
};

type BranchFilterState = {
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
};

export const useBranchFilterStore = create<BranchFilterState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => branchFilterStorage),
      partialize: (state) => ({
        selectedBranchId: state.selectedBranchId,
      }),
    },
  ),
);

/** Same API as the former React context hook. */
export function useBranchFilter() {
  const selectedBranchId = useBranchFilterStore((s) => s.selectedBranchId);
  const setSelectedBranchId = useBranchFilterStore((s) => s.setSelectedBranchId);
  return { selectedBranchId, setSelectedBranchId };
}

/** Toolbar helpers: `"all"` when no branch selected. */
export function branchIdForToolbar(selectedBranchId: string | null): string {
  return selectedBranchId ?? "all";
}

export function setBranchFromToolbar(
  value: string,
  setSelectedBranchId: (id: string | null) => void,
) {
  setSelectedBranchId(value === "all" ? null : value);
}
