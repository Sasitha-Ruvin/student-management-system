"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addClassDay,
  deleteClassDay,
  fetchBranchDetail,
  updateBranch,
} from "@/lib/api/branches";
import type {
  BranchDetailDto,
  CreateClassDayBody,
  UpdateBranchBody,
} from "@/types/api/branch";

export function useBranchDetail(branchId: string) {
  const [detail, setDetail] = useState<BranchDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScheduledSessions, setHasScheduledSessions] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchBranchDetail(branchId);
      setDetail(data);
      setHasScheduledSessions(data.hasScheduledSessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load branch");
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(body: UpdateBranchBody) {
    const updated = await updateBranch(branchId, body);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            name: updated.name,
            location: updated.location,
            isActive: updated.isActive,
            activeBatchCount: updated.activeBatchCount,
            activeStudentCount: updated.activeStudentCount,
            stats: {
              ...prev.stats,
              totalEnrolled: updated.activeStudentCount,
            },
          }
        : prev,
    );
  }

  async function addDay(body: CreateClassDayBody) {
    const result = await addClassDay(branchId, body);
    setHasScheduledSessions(result.hasScheduledSessions);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            classDays: [...prev.classDays, result.classDay].sort(
              (a, b) => a.dayOfWeek - b.dayOfWeek,
            ),
          }
        : prev,
    );
  }

  async function removeDay(dayId: string) {
    const result = await deleteClassDay(branchId, dayId);
    setHasScheduledSessions(result.hasScheduledSessions);
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            classDays: prev.classDays.filter((day) => day.id !== dayId),
          }
        : prev,
    );
  }

  return {
    detail,
    isLoading,
    error,
    hasScheduledSessions,
    setHasScheduledSessions,
    reload: load,
    saveProfile,
    addDay,
    removeDay,
  };
}
