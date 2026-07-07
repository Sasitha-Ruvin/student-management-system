"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AssignBatchModal } from "@/components/students/assign-batch-modal";
import { EnrollBatchModal } from "@/components/students/enroll-batch-modal";
import { ChangePortalPasswordModal } from "@/components/students/change-portal-password-modal";
import { CreatePortalAccountModal } from "@/components/students/create-portal-account-modal";
import { DeleteStudentModal } from "@/components/students/delete-student-modal";
import { EditStudentModal } from "@/components/students/edit-student-modal";
import { StudentCardGrid } from "@/components/students/student-card-grid";
import { StudentListTabs } from "@/components/students/student-list-tabs";
import { StudentPageHeader } from "@/components/students/student-page-header";
import { StudentPagination } from "@/components/students/student-pagination";
import { StudentTable } from "@/components/students/student-table";
import { StudentToolbar } from "@/components/students/student-toolbar";
import { BranchListSkeleton, InlineLoader } from "@/components/ui/loading-state";
import {
  PAGE_SIZE_CARDS,
  PAGE_SIZE_TABLE,
  studentFilterInitialFromSearchParams,
  studentListQueryFromFilters,
  useStudentFilters,
} from "@/hooks/use-student-filters";
import { useStudentNavigation } from "@/hooks/use-student-navigation";
import { useStudentPendingCount, useStudents } from "@/hooks/use-students";
import { useMediaQuery } from "@/hooks/use-media-query";
import { updateEnrollment } from "@/lib/api/batches";
import { loadStudentDetailForAdmin } from "@/app/actions/load-student-detail";
import { disablePortalAccount } from "@/lib/api/students";
import type { EnrollmentAction } from "@/types/api/batch";
import type { StudentDetail, StudentListItem } from "@/types/api/student";

export function StudentManagementPage() {
  const searchParams = useSearchParams();
  const filters = useStudentFilters(
    studentFilterInitialFromSearchParams(searchParams),
  );
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { navigateToStudent, prefetchStudent, navigatingStudentId } =
    useStudentNavigation();

  const [assignStudent, setAssignStudent] = useState<StudentListItem | null>(null);
  const [enrollStudent, setEnrollStudent] = useState<StudentListItem | null>(null);
  const [portalStudent, setPortalStudent] = useState<StudentDetail | null>(null);
  const [passwordStudent, setPasswordStudent] = useState<StudentDetail | null>(null);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<
    StudentListItem | StudentDetail | null
  >(null);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [editDetail, setEditDetail] = useState<StudentDetail | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);

  const pageSize =
    isMobile || filters.view === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;

  const listQuery = useMemo(
    () =>
      studentListQueryFromFilters({
        page: filters.page,
        limit: pageSize,
        search: filters.search,
        listTab: filters.listTab,
        enrollmentStatus: filters.enrollmentStatus,
        branchId: filters.branchId,
        source: filters.source,
      }),
    [
      filters.page,
      pageSize,
      filters.search,
      filters.listTab,
      filters.enrollmentStatus,
      filters.branchId,
      filters.source,
    ],
  );

  const pendingCount = useStudentPendingCount({
    branchId: filters.branchId === "all" ? undefined : filters.branchId,
    source: filters.source === "all" ? undefined : filters.source,
  });

  const {
    students,
    total,
    totalPages,
    isLoading,
    isRefreshing,
    error,
    reload,
  } = useStudents(listQuery);

  const showCards = isMobile || filters.view === "cards";
  const isInitialLoad = isLoading && students.length === 0;

  async function handleDisablePortal(student: StudentListItem) {
    if (
      !confirm(
        `Disable portal login for ${student.fullName}? They will not be able to sign in.`,
      )
    ) {
      return;
    }
    setBusyStudentId(student.id);
    try {
      await disablePortalAccount(student.id, { note: "Disabled by admin" });
      await reload({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to disable portal");
    } finally {
      setBusyStudentId(null);
    }
  }

  async function loadStudentDetail(studentId: string): Promise<StudentDetail> {
    return loadStudentDetailForAdmin(studentId);
  }

  async function handleEdit(student: StudentListItem) {
    setEditError(null);
    setBusyStudentId(student.id);
    try {
      setEditDetail(await loadStudentDetail(student.id));
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not load student");
    } finally {
      setBusyStudentId(null);
    }
  }

  async function handleCreatePortal(student: StudentListItem) {
    setBusyStudentId(student.id);
    try {
      setPortalStudent(await loadStudentDetail(student.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not load student");
    } finally {
      setBusyStudentId(null);
    }
  }

  async function handleChangePortalPassword(student: StudentListItem) {
    setBusyStudentId(student.id);
    try {
      setPasswordStudent(await loadStudentDetail(student.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not load student");
    } finally {
      setBusyStudentId(null);
    }
  }

  function handleDeleteStudent(student: StudentListItem) {
    setDeleteStudentTarget(student);
  }

  async function handleEnrollmentAction(
    student: StudentListItem,
    action: EnrollmentAction,
  ) {
    if (!student.primaryEnrollmentId || !student.primaryBatchId) return;
    if (action.action === "drop" && !confirm(`Drop ${student.fullName} from their batch?`)) {
      return;
    }
    setBusyStudentId(student.id);
    try {
      await updateEnrollment(
        student.primaryBatchId,
        student.primaryEnrollmentId,
        action,
      );
      await reload({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyStudentId(null);
    }
  }

  const emptyMessage =
    filters.listTab === "pending"
      ? "No students waiting for batch assignment."
      : filters.listTab === "enrolled"
        ? "No enrolled students match your filters."
        : "No students found. Register a student or adjust your filters.";

  return (
    <div className="space-y-4 pb-6 sm:space-y-5 sm:pb-8">
      <StudentPageHeader totalCount={total} listTab={filters.listTab} />

      <StudentListTabs
        activeTab={filters.listTab}
        onTabChange={filters.setListTab}
        pendingCount={pendingCount}
      />

      <StudentToolbar
        search={filters.search}
        setSearch={filters.setSearch}
        listTab={filters.listTab}
        enrollmentStatus={filters.enrollmentStatus}
        setEnrollmentStatus={filters.setEnrollmentStatus}
        branchId={filters.branchId}
        setBranchId={filters.setBranchId}
        source={filters.source}
        setSource={filters.setSource}
        view={filters.view}
        setView={filters.setView}
        totalCount={total}
      />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {editError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {editError}
        </p>
      ) : null}

      {portalMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {portalMessage}
        </p>
      ) : null}

      {isRefreshing && !isInitialLoad ? (
        <InlineLoader label="Refreshing…" />
      ) : null}

      {isInitialLoad ? (
        <BranchListSkeleton variant={showCards ? "cards" : "table"} />
      ) : students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-secondary-400 px-4 py-12 text-center text-neutral-600">
          {emptyMessage}
        </p>
      ) : showCards ? (
        <StudentCardGrid
          students={students}
          onNavigate={navigateToStudent}
          onPrefetch={prefetchStudent}
          navigatingStudentId={navigatingStudentId}
          onAssign={setAssignStudent}
          onEdit={(s) => void handleEdit(s)}
          onEnroll={setEnrollStudent}
          onDelete={handleDeleteStudent}
        />
      ) : (
        <StudentTable
          students={students}
          onNavigate={navigateToStudent}
          onPrefetch={prefetchStudent}
          navigatingStudentId={navigatingStudentId}
          onAssign={setAssignStudent}
          onEdit={(s) => void handleEdit(s)}
          onEnroll={setEnrollStudent}
          onCreatePortal={(s) => void handleCreatePortal(s)}
          onDisablePortal={(s) => void handleDisablePortal(s)}
          onChangePortalPassword={(s) => void handleChangePortalPassword(s)}
          onDelete={handleDeleteStudent}
          onEnrollmentAction={(s, a) => void handleEnrollmentAction(s, a)}
          busyStudentId={busyStudentId}
        />
      )}

      <StudentPagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={filters.setPage}
      />

      {assignStudent ? (
        <AssignBatchModal
          open
          student={assignStudent}
          onClose={() => setAssignStudent(null)}
          onSuccess={() => {
            setAssignStudent(null);
            void reload({ silent: true });
          }}
        />
      ) : null}

      {enrollStudent ? (
        <EnrollBatchModal
          open
          student={enrollStudent}
          onClose={() => setEnrollStudent(null)}
          onSuccess={() => {
            setEnrollStudent(null);
            void reload({ silent: true });
          }}
        />
      ) : null}

      {portalStudent ? (
        <CreatePortalAccountModal
          open
          studentId={portalStudent.id}
          studentName={portalStudent.fullName}
          email={portalStudent.email}
          contactNumber={portalStudent.contactNumber}
          whatsappNumber={portalStudent.whatsappNumber}
          onClose={() => setPortalStudent(null)}
          onSuccess={(message) => {
            setPortalStudent(null);
            setPortalMessage(message ?? "Portal account created.");
            void reload({ silent: true });
          }}
        />
      ) : null}

      {passwordStudent ? (
        <ChangePortalPasswordModal
          open
          studentId={passwordStudent.id}
          studentName={passwordStudent.fullName}
          email={passwordStudent.email}
          onClose={() => setPasswordStudent(null)}
          onSuccess={(message) => {
            setPasswordStudent(null);
            setPortalMessage(message ?? "Portal password updated.");
          }}
        />
      ) : null}

      {editDetail ? (
        <EditStudentModal
          open
          student={editDetail}
          onClose={() => setEditDetail(null)}
          onSuccess={() => {
            setEditDetail(null);
            void reload({ silent: true });
          }}
        />
      ) : null}

      {deleteStudentTarget ? (
        <DeleteStudentModal
          open
          studentId={deleteStudentTarget.id}
          studentName={deleteStudentTarget.fullName}
          email={deleteStudentTarget.email}
          onClose={() => setDeleteStudentTarget(null)}
          onSuccess={() => {
            const name = deleteStudentTarget.fullName;
            setDeleteStudentTarget(null);
            setPortalMessage(`${name} was deleted.`);
            void reload({ silent: true });
          }}
        />
      ) : null}
    </div>
  );
}
