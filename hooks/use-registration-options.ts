import { useCallback, useEffect, useState } from "react";

import {
  createRegistrationEyeColor,
  createRegistrationHairColor,
  fetchRegistrationOptions,
  type RegistrationOptionsResponse,
} from "@/lib/api/registration";
import type { RegistrationOptionDto } from "@/types/api/settings";

type RegistrationOptionsState = {
  skinColors: RegistrationOptionDto[];
  modelingInterests: RegistrationOptionDto[];
  eyeColors: RegistrationOptionDto[];
  hairColors: RegistrationOptionDto[];
  loading: boolean;
  error: string | null;
  addEyeColorOption: (label: string) => Promise<void>;
  addHairColorOption: (label: string) => Promise<void>;
};

type CachedRegistrationOptions = RegistrationOptionsResponse;

let cachedOptions: CachedRegistrationOptions | null = null;
let pendingLoad: Promise<CachedRegistrationOptions> | null = null;

function loadRegistrationOptionsOnce(): Promise<CachedRegistrationOptions> {
  if (cachedOptions) {
    return Promise.resolve(cachedOptions);
  }

  if (!pendingLoad) {
    pendingLoad = fetchRegistrationOptions()
      .then((data) => {
        cachedOptions = data;
        return data;
      })
      .catch((error: unknown) => {
        pendingLoad = null;
        throw error;
      });
  }

  return pendingLoad;
}

/** Shared registration option lists for the student wizard and edit modal. */
export function useRegistrationOptions(): RegistrationOptionsState {
  const [state, setState] = useState<Omit<RegistrationOptionsState, "addEyeColorOption" | "addHairColorOption">>(() => ({
    skinColors: cachedOptions?.skinColors ?? [],
    modelingInterests: cachedOptions?.modelingInterests ?? [],
    eyeColors: cachedOptions?.eyeColors ?? [],
    hairColors: cachedOptions?.hairColors ?? [],
    loading: !cachedOptions,
    error: null,
  }));

  const applyOptions = useCallback(
    (data: CachedRegistrationOptions) => {
      cachedOptions = data;
      setState({
        skinColors: data.skinColors,
        modelingInterests: data.modelingInterests,
        eyeColors: data.eyeColors,
        hairColors: data.hairColors,
        loading: false,
        error: null,
      });
    },
    [],
  );

  useEffect(() => {
    if (cachedOptions) {
      applyOptions(cachedOptions);
      return;
    }

    let cancelled = false;

    void loadRegistrationOptionsOnce()
      .then((data) => {
        if (cancelled) return;
        applyOptions(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load registration options",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [applyOptions]);

  const addEyeColorOption = useCallback(async (label: string) => {
    const created = await createRegistrationEyeColor({ label });
    setState((prev) => {
      const next = {
        ...prev,
        eyeColors: [...prev.eyeColors, created].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
        ),
      };
      if (cachedOptions) {
        cachedOptions = { ...cachedOptions, eyeColors: next.eyeColors };
      }
      return next;
    });
  }, []);

  const addHairColorOption = useCallback(async (label: string) => {
    const created = await createRegistrationHairColor({ label });
    setState((prev) => {
      const next = {
        ...prev,
        hairColors: [...prev.hairColors, created].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
        ),
      };
      if (cachedOptions) {
        cachedOptions = { ...cachedOptions, hairColors: next.hairColors };
      }
      return next;
    });
  }, []);

  return {
    ...state,
    addEyeColorOption,
    addHairColorOption,
  };
}

/** Warm the registration options cache as soon as the wizard page mounts. */
export function prefetchRegistrationOptions(): void {
  void loadRegistrationOptionsOnce().catch(() => {
    // Hook surfaces errors to the UI.
  });
}

export function clearRegistrationOptionsCache(): void {
  cachedOptions = null;
  pendingLoad = null;
}
