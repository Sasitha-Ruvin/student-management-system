"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AssignBatchModal } from "@/components/students/assign-batch-modal";
import { EnrollBatchModal } from "@/components/students/enroll-batch-modal";
import { ChangePortalPasswordModal } from "@/components/students/change-portal-password-modal";
import { CreatePortalAccountModal } from "@/components/students/create-portal-account-modal";
import { DeleteStudentModal } from "@/components/students/delete-student-modal";
import { EditStudentModal } from "@/components/students/edit-student-modal";
import { StudentDocumentsPanel } from "@/components/students/student-documents-panel";
import { StudentPaymentsTab } from "@/components/students/student-payments-tab";
import { StudentAvatar } from "@/components/students/student-avatar";
import { StudentSourceBadge } from "@/components/students/student-source-badge";
import { EnrollmentPaymentBadge } from "@/components/payments/enrollment-payment-badge";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import { disablePortalAccount } from "@/lib/api/students";
import { needsModelCodeOnApproval } from "@/lib/students/student-source";
import { formatMoney } from "@/lib/format/money";
import type { StudentDetail, StudentListItem } from "@/types/api/student";

type StudentDetailPageProps = {
  studentId: string;
  initialDetail: StudentDetail;
};

type StudentDetailTab = "overview" | "payments";

export function StudentDetailPage({
  studentId,
  initialDetail,
}: StudentDetailPageProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [activeTab, setActiveTab] = useState<StudentDetailTab>("overview");
  const [assignOpen, setAssignOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDetail, setEditDetail] = useState<StudentDetail | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const listItemForModal: StudentListItem | null = useMemo(() => {
    if (!detail) return null;
    return {
      id: detail.id,
      modelCode: detail.modelCode,
      fullName: detail.fullName,
      email: detail.email,
      contactNumber: detail.contactNumber,
      whatsappNumber: detail.whatsappNumber,
      nic: detail.nic,
      gender: detail.gender,
      age: detail.age,
      source: detail.source,
      photoUrl: detail.photoUrl,
      preferredBranchId: detail.preferredBranchId,
      preferredBranchName: detail.preferredBranchName,
      preferredBranchRaw: detail.preferredBranchRaw,
      preferredDate: detail.preferredDate,
      enrollmentStatus: detail.enrollmentStatus,
      currentBatchName: detail.currentBatchName,
      currentBatchCode: detail.currentBatchCode,
      primaryEnrollmentId:
        detail.enrollments.find((e) => e.status === "ACTIVE")?.enrollmentId ??
        detail.enrollments[0]?.enrollmentId ??
        null,
      primaryBatchId:
        detail.enrollments.find((e) => e.status === "ACTIVE")?.batchId ??
        detail.enrollments[0]?.batchId ??
        null,
      regFeePaid:
        detail.enrollments.find((e) => e.status === "ACTIVE")?.regFeePaid ??
        detail.enrollments[0]?.regFeePaid ??
        null,
      hasPortalAccount: detail.hasPortalAccount,
      isLoginEnabled: detail.isLoginEnabled,
      createdAt: detail.createdAt,
    };
  }, [detail]);

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  function reload() {
    router.refresh();
  }

  const hasUnassigned = detail.enrollments.some((e) => e.status === "UNASSIGNED");
  const isWebsitePending = needsModelCodeOnApproval(detail.source, detail.modelCode);

  function handleOpenEdit() {
    setEditDetail(detail);
    setEditOpen(true);
  }

  function handleOpenPortal() {
    setPortalOpen(true);
  }

  async function handleDisablePortal() {
    if (!detail) return;
    setBusy(true);
    try {
      await disablePortalAccount(detail.id, {
        note: "Disabled by admin",
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-6 pb-8">
      <Link
        href="/dashboard/students"
        className="text-sm text-neutral-700 hover:text-primary-900"
      >
        ← Back to students
      </Link>

      {saveMessage ? (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {saveMessage}
        </p>
      ) : null}

      {isWebsitePending ? (
        <p className="rounded-xl border border-violet-300/60 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          This student applied via the website and is waiting for approval. Assign them
          to a batch to set their model code and activate their enrollment.
        </p>
      ) : null}

      <header className="flex flex-col gap-4 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm sm:flex-row sm:items-start sm:gap-6">
        <StudentAvatar
          studentId={detail.id}
          fullName={detail.fullName}
          photoUrl={detail.photoUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-2xl text-primary-900 sm:text-3xl">
              {detail.fullName}
            </h1>
            <StudentStatusBadge status={detail.enrollmentStatus} />
            <StudentSourceBadge source={detail.source} modelCode={detail.modelCode} />
          </div>
          <p className="font-mono text-sm text-neutral-600">{detail.modelCode}</p>
          <p className="mt-2 text-sm text-neutral-700">{detail.email}</p>
          <p className="text-sm text-neutral-600">
            {detail.contactNumber} · NIC {detail.nic}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
          >
            Edit student
          </button>
          {hasUnassigned ? (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="min-h-11 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100"
            >
              Assign to batch
            </button>
          ) : detail.enrollmentStatus === "DROPPED" ? (
            <button
              type="button"
              onClick={() => setEnrollOpen(true)}
              className="min-h-11 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100"
            >
              Enroll in batch
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEnrollOpen(true)}
              className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
            >
              Add to another batch
            </button>
          )}
          {!detail.hasPortalAccount ? (
            <button
              type="button"
              onClick={handleOpenPortal}
              className="min-h-11 rounded-xl border border-primary-900 px-4 py-2.5 text-sm font-medium text-primary-900"
            >
              Create portal account
            </button>
          ) : (
            <>
              {!detail.isLoginEnabled ? (
                <span className="self-center text-xs text-amber-800">Portal disabled</span>
              ) : null}
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm text-neutral-700"
              >
                Change portal password
              </button>
              {detail.isLoginEnabled ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDisablePortal()}
                  className="min-h-11 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm text-neutral-700"
                >
                  Disable portal
                </button>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="min-h-11 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive"
          >
            Delete student
          </button>
        </div>
      </header>

      <nav
        className="flex gap-1 border-b border-secondary-300/60"
        aria-label="Student sections"
      >
        {(
          [
            ["overview", "Overview"],
            ["payments", "Payments"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={[
              "min-h-10 px-4 text-sm font-medium transition-colors",
              activeTab === id
                ? "border-b-2 border-primary-900 text-primary-900"
                : "text-neutral-600 hover:text-primary-900",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "payments" ? (
        <StudentPaymentsTab
          studentId={detail.id}
          studentName={detail.fullName}
          enrollments={detail.enrollments}
          onRegistrationFeeRecorded={reload}
        />
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-secondary-300/40 bg-secondary-100/30 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Source</p>
          <div className="mt-1">
            <StudentSourceBadge source={detail.source} modelCode={detail.modelCode} />
          </div>
        </div>
        <MiniStat
          label="Preferred branch"
          value={detail.preferredBranchName ?? detail.preferredBranchRaw ?? "—"}
        />
        <MiniStat label="Preferred day" value={detail.preferredDate ?? "—"} />
        <MiniStat
          label="Portal"
          value={detail.hasPortalAccount ? (detail.isLoginEnabled ? "Active" : "Disabled") : "None"}
        />
      </div>

      <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
        <h2 className="mb-2 font-headline text-lg text-primary-900">Enrollments</h2>
        {detail.enrollmentStatus === "ACTIVE" ||
        detail.enrollmentStatus === "SUSPENDED" ||
        detail.enrollmentStatus === "ON_HOLD" ? (
          <p className="mb-4 text-sm text-neutral-600">
            For a student visiting another branch for one or two sessions, use{" "}
            <span className="font-medium">Sessions → Attendance → Guest student</span>{" "}
            instead of adding another batch. Use{" "}
            <span className="font-medium">Add to another batch</span> only when they
            regularly attend a second batch (new payment plan and session roster).
          </p>
        ) : null}
        {detail.enrollments.length === 0 ? (
          <p className="text-sm text-neutral-600">No enrollments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Paid / Owed</th>
                  <th className="px-3 py-2">Reg fee</th>
                </tr>
              </thead>
              <tbody>
                {detail.enrollments.map((e) => (
                  <tr key={e.enrollmentId} className="border-b border-secondary-300/40 last:border-0">
                    <td className="px-3 py-2">
                      {e.batchCode ? (
                        <Link
                          href={`/dashboard/batches/${e.batchId}`}
                          className="font-mono text-primary-900 hover:underline"
                        >
                          {e.batchCode}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StudentStatusBadge status={e.status} />
                    </td>
                    <td className="px-3 py-2">
                      <EnrollmentPaymentBadge
                        installmentSource={e.installmentSource}
                        paymentPlanName={e.paymentPlanName}
                        paymentPath={e.paymentPath}
                      />
                      {e.paymentPath === "INSTALLMENT" &&
                      (!e.installmentSource || e.installmentSource === "BATCH") ? (
                        <span className="mt-1 block text-xs text-neutral-500">
                          Batch default
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {formatMoney(e.totalPaid, "LKR")} / {formatMoney(e.totalOwed, "LKR")}
                    </td>
                    <td className="px-3 py-2">
                      {e.regFeePaid ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
        <h2 className="mb-4 font-headline text-lg text-primary-900">Profile</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <ProfileRow label="Date of birth" value={detail.dob} />
          <ProfileRow label="Age" value={String(detail.age)} />
          <ProfileRow label="Gender" value={detail.gender} />
          <ProfileRow label="WhatsApp" value={detail.whatsappNumber} />
          <ProfileRow label="Address" value={detail.address} className="sm:col-span-2" />
          {detail.height !== null ? (
            <ProfileRow label="Height" value={`${detail.height} cm`} />
          ) : null}
          {detail.weight !== null ? (
            <ProfileRow label="Weight" value={`${detail.weight} kg`} />
          ) : null}
          {detail.chest !== null ? (
            <ProfileRow label="Chest" value={`${detail.chest}"`} />
          ) : null}
          {detail.shoulder !== null ? (
            <ProfileRow label="Shoulder" value={`${detail.shoulder}"`} />
          ) : null}
          {detail.waist !== null ? (
            <ProfileRow label="Waist" value={`${detail.waist}"`} />
          ) : null}
          {detail.shoeSize ? (
            <ProfileRow label="Shoe size (UK)" value={detail.shoeSize} />
          ) : null}
          {detail.skinColorLabel ? (
            <ProfileRow label="Skin color" value={detail.skinColorLabel} />
          ) : null}
          {detail.eyeColor ? (
            <ProfileRow label="Eye color" value={detail.eyeColor} />
          ) : null}
          {detail.hairColor ? (
            <ProfileRow label="Hair color" value={detail.hairColor} />
          ) : null}
          {detail.talents ? (
            <ProfileRow label="Talents" value={detail.talents} className="sm:col-span-2" />
          ) : null}
          {detail.modelingInterests.length > 0 ? (
            <ProfileRow
              label="Modeling interests"
              value={detail.modelingInterests.join(", ")}
              className="sm:col-span-2"
            />
          ) : null}
        </dl>
      </section>

      <StudentDocumentsPanel
        studentId={detail.id}
        documents={detail.documents}
        onUpdated={() => void reload()}
      />
        </>
      )}

      {assignOpen && listItemForModal ? (
        <AssignBatchModal
          open
          student={listItemForModal}
          onClose={() => setAssignOpen(false)}
          onSuccess={() => {
            setAssignOpen(false);
            void reload();
          }}
        />
      ) : null}

      {enrollOpen && listItemForModal ? (
        <EnrollBatchModal
          open
          student={listItemForModal}
          onClose={() => setEnrollOpen(false)}
          onSuccess={() => {
            setEnrollOpen(false);
            void reload();
          }}
        />
      ) : null}

      {portalOpen ? (
        <CreatePortalAccountModal
          open
          studentId={detail.id}
          studentName={detail.fullName}
          email={detail.email}
          contactNumber={detail.contactNumber}
          whatsappNumber={detail.whatsappNumber}
          onClose={() => setPortalOpen(false)}
          onSuccess={(message) => {
            setPortalOpen(false);
            setSaveMessage(message ?? "Portal account created.");
            void reload();
          }}
        />
      ) : null}

      {passwordOpen ? (
        <ChangePortalPasswordModal
          open
          studentId={detail.id}
          studentName={detail.fullName}
          email={detail.email}
          onClose={() => setPasswordOpen(false)}
          onSuccess={(message) => {
            setPasswordOpen(false);
            setSaveMessage(message ?? "Portal password updated.");
          }}
        />
      ) : null}

      {editOpen && editDetail ? (
        <EditStudentModal
          open
          student={editDetail}
          onClose={() => {
            setEditOpen(false);
            setEditDetail(null);
          }}
          onSuccess={(warnings) => {
            setEditOpen(false);
            setEditDetail(null);
            if (warnings?.length) {
              setSaveMessage(warnings.join(" "));
            } else {
              setSaveMessage(null);
            }
            void reload();
          }}
          onDocumentsUpdated={() => void reload()}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteStudentModal
          open
          studentId={detail.id}
          studentName={detail.fullName}
          email={detail.email}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => {
            router.push("/dashboard/students");
          }}
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-secondary-300/40 bg-secondary-100/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="font-headline text-sm text-primary-900">{value}</p>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-neutral-500 uppercase">{label}</dt>
      <dd className="text-primary-900">{value}</dd>
    </div>
  );
}
