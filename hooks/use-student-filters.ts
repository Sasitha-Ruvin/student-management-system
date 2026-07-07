"use client";

import { useState } from "react";

import {
  branchIdForToolbar,
  setBranchFromToolbar,
  useBranchFilter,
} from "@/stores/branch-filter-store";
import type {
  StudentEnrollmentStatus,
  StudentListTab,
  StudentSource,
} from "@/types/api/student";

export type StudentViewMode = "cards" | "table";
export type StudentStatusFilter = StudentEnrollmentStatus | "all";
export type StudentSourceFilter = StudentSource | "all";

export { type StudentListTab };

export const PAGE_SIZE_CARDS = 6;
export const PAGE_SIZE_TABLE = 10;

const VALID_SOURCES = new Set<StudentSource>(["MANUAL", "WEBHOOK", "WEBSITE"]);
const VALID_STATUSES = new Set<StudentEnrollmentStatus>([
  "UNASSIGNED",
  "ACTIVE",
  "SUSPENDED",
  "ON_HOLD",
  "COMPLETED",
  "DROPPED",
]);
const VALID_TABS = new Set<StudentListTab>(["enrolled", "pending", "all"]);

/** Raw URL/query values — parsed inside `useStudentFilters`. */
export type StudentFilterInitial = {
  source?: string | null;
  enrollmentStatus?: string | null;
  listTab?: string | null;
};

export function studentFilterInitialFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): StudentFilterInitial {
  return {
    source: searchParams.get("source"),
    enrollmentStatus: searchParams.get("enrollmentStatus"),
    listTab: searchParams.get("tab"),
  };
}

function parseInitialSource(value: string | null | undefined): StudentSourceFilter {
  if (value && VALID_SOURCES.has(value as StudentSource)) {
    return value as StudentSource;
  }
  return "all";
}

function parseInitialStatus(value: string | null | undefined): StudentStatusFilter {
  if (value && VALID_STATUSES.has(value as StudentEnrollmentStatus)) {
    return value as StudentEnrollmentStatus;
  }
  return "all";
}

function parseInitialTab(
  tab: string | null | undefined,
  enrollmentStatus: string | null | undefined,
): StudentListTab {
  if (tab && VALID_TABS.has(tab as StudentListTab)) {
    return tab as StudentListTab;
  }
  if (enrollmentStatus === "UNASSIGNED") {
    return "pending";
  }
  return "enrolled";
}

export function useStudentFilters(initial?: StudentFilterInitial) {
  const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
  const [search, setSearchState] = useState("");
  const [listTab, setListTabState] = useState<StudentListTab>(
    parseInitialTab(initial?.listTab, initial?.enrollmentStatus),
  );
  const [enrollmentStatus, setEnrollmentStatusState] =
    useState<StudentStatusFilter>(parseInitialStatus(initial?.enrollmentStatus));
  const [source, setSourceState] = useState<StudentSourceFilter>(
    parseInitialSource(initial?.source),
  );
  const [view, setViewState] = useState<StudentViewMode>("table");
  const [page, setPage] = useState(1);

  const branchId = branchIdForToolbar(selectedBranchId);

  function resetPage() {
    setPage(1);
  }

  return {
    search,
    setSearch: (v: string) => {
      setSearchState(v);
      resetPage();
    },
    listTab,
    setListTab: (v: StudentListTab) => {
      setListTabState(v);
      if (v === "pending") {
        setEnrollmentStatusState("all");
      } else if (v === "enrolled" && enrollmentStatus === "UNASSIGNED") {
        setEnrollmentStatusState("all");
      }
      resetPage();
    },
    enrollmentStatus,
    setEnrollmentStatus: (v: StudentStatusFilter) => {
      setEnrollmentStatusState(v);
      resetPage();
    },
    branchId,
    setBranchId: (v: string) => {
      setBranchFromToolbar(v, setSelectedBranchId);
      resetPage();
    },
    selectedBranchId,
    source,
    setSource: (v: StudentSourceFilter) => {
      setSourceState(v);
      resetPage();
    },
    view,
    setView: (v: StudentViewMode) => {
      setViewState(v);
      resetPage();
    },
    page,
    setPage,
  };
}

/** Maps UI tab + optional status sub-filter to API list query fields. */
export function studentListQueryFromFilters(filters: {
  listTab: StudentListTab;
  enrollmentStatus: StudentStatusFilter;
  page: number;
  limit: number;
  search: string;
  branchId: string;
  source: StudentSourceFilter;
}) {
  const enrollmentStatus =
    filters.listTab === "pending"
      ? undefined
      : filters.enrollmentStatus === "all"
        ? undefined
        : filters.enrollmentStatus;

  return {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    listTab: filters.listTab,
    enrollmentStatus,
    branchId: filters.branchId === "all" ? undefined : filters.branchId,
    source: filters.source === "all" ? undefined : filters.source,
  };
}
