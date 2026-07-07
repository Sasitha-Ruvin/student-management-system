"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { addAlumni } from "@/lib/api/alumni";
import { fetchBatches } from "@/lib/api/batches";
import { fetchBranchPicker } from "@/lib/api/branches";
import { fetchStudents } from "@/lib/api/students";
import type { BatchListItem } from "@/types/api/batch";
import type { BranchPickerItem } from "@/types/api/branch";
import type { StudentListItem } from "@/types/api/student";

type AddAlumniModalProps = {
  open: boolean;
  defaultBranchId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

type TabId = "existing" | "new";

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AddAlumniModal({
  open,
  defaultBranchId,
  onClose,
  onSuccess,
}: AddAlumniModalProps) {
  const [tab, setTab] = useState<TabId>("existing");
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [batchId, setBatchId] = useState("");
  const [branches, setBranches] = useState<BranchPickerItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [graduatedIntake, setGraduatedIntake] = useState("");
  const [graduatedAt, setGraduatedAt] = useState(todayIsoDate);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentListItem[]>([]);
  const [studentId, setStudentId] = useState("");
  const [searching, setSearching] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nic, setNic] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const resolvedDefaultBranchId =
    defaultBranchId && defaultBranchId !== "all" ? defaultBranchId : "";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTab("existing");
    setGraduatedAt(todayIsoDate());
    setGraduatedIntake("");
    setBranchId(resolvedDefaultBranchId);
    void fetchBatches({
      limit: 100,
      status: "all",
      branchId: resolvedDefaultBranchId || undefined,
    })
      .then((page) => {
        setBatches(page.items);
        setBatchId(page.items[0]?.id ?? "");
      })
      .catch(() => setError("Failed to load batches"));
    void fetchBranchPicker()
      .then((items) => {
        setBranches(items);
        if (!resolvedDefaultBranchId && items[0]?.id) {
          setBranchId(items[0].id);
        }
      })
      .catch(() => setError("Failed to load branches"));
  }, [open, resolvedDefaultBranchId]);

  useEffect(() => {
    if (!open || tab !== "existing") return;
    const q = studentSearch.trim();
    if (q.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetchStudents({ search: q, limit: 8, page: 1 })
        .then((page) => setStudentResults(page.items))
        .catch(() => setStudentResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, tab, studentSearch]);

  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        value: b.id,
        label: `${b.batchCode} — ${b.name}`,
      })),
    [batches],
  );

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: b.name,
      })),
    [branches],
  );

  const selectedStudent = studentResults.find((s) => s.id === studentId);
  const showBranchSelect = tab === "new" && !resolvedDefaultBranchId;

  async function handleSubmit() {
    if (!graduatedAt) {
      setError("Graduation date is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (tab === "existing") {
        if (!batchId) {
          setError("Select a batch");
          setIsSubmitting(false);
          return;
        }
        if (!studentId) {
          setError("Select a student");
          setIsSubmitting(false);
          return;
        }
        await addAlumni({
          mode: "existing",
          studentId,
          batchId,
          graduatedAt,
          notes: notes.trim() || undefined,
        });
      } else {
        const effectiveBranchId = resolvedDefaultBranchId || branchId;
        if (!fullName.trim() || !email.trim() || !nic.trim()) {
          setError("Full name, email, and NIC are required");
          setIsSubmitting(false);
          return;
        }
        if (!effectiveBranchId) {
          setError("Select a branch");
          setIsSubmitting(false);
          return;
        }
        await addAlumni({
          mode: "new",
          fullName: fullName.trim(),
          email: email.trim(),
          nic: nic.trim(),
          branchId: effectiveBranchId,
          graduatedAt,
          graduatedIntake: graduatedIntake.trim() || undefined,
          contactNumber: contactNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add alumni");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add alumni" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-secondary-100/50 p-1">
          <button
            type="button"
            onClick={() => setTab("existing")}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "existing"
                ? "bg-tertiary-100 text-primary-900 shadow-sm"
                : "text-neutral-600 hover:text-primary-900",
            ].join(" ")}
          >
            Existing student
          </button>
          <button
            type="button"
            onClick={() => setTab("new")}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === "new"
                ? "bg-tertiary-100 text-primary-900 shadow-sm"
                : "text-neutral-600 hover:text-primary-900",
            ].join(" ")}
          >
            New person
          </button>
        </div>

        {tab === "existing" ? (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary-900">Search student</span>
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentId("");
                }}
                placeholder="Name, NIC, or model code…"
                className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            {searching ? (
              <p className="text-xs text-neutral-600">Searching…</p>
            ) : null}
            {studentResults.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-secondary-300/60 p-2">
                {studentResults.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      className={[
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        studentId === s.id
                          ? "bg-primary-900/10 text-primary-900"
                          : "hover:bg-secondary-100",
                      ].join(" ")}
                    >
                      <span className="font-medium">{s.fullName}</span>
                      <span className="ml-2 font-mono text-xs text-neutral-600">
                        {s.modelCode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedStudent ? (
              <p className="text-sm text-neutral-700">
                Selected: <span className="font-medium">{selectedStudent.fullName}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-primary-900">Full name *</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-primary-900">Email *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-primary-900">NIC *</span>
                <input
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-primary-900">Contact number</span>
                <input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Optional — defaults if empty"
                  className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
                />
              </label>
            </div>
            {showBranchSelect ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-primary-900">Branch *</span>
                <Select
                  value={branchId}
                  onChange={setBranchId}
                  options={branchOptions}
                  placeholder="Select branch"
                  disabled={branchOptions.length === 0}
                  aria-label="Branch"
                />
              </label>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary-900">
                Graduated intake
              </span>
              <input
                value={graduatedIntake}
                onChange={(e) => setGraduatedIntake(e.target.value)}
                placeholder="e.g. January 2019 — Colombo intake"
                className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
              />
              <p className="text-xs text-neutral-600">
                Optional — for graduates from intakes before this system was used.
              </p>
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {tab === "existing" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-primary-900">Batch *</span>
              <Select
                value={batchId}
                onChange={setBatchId}
                options={batchOptions}
                placeholder="Select batch"
                disabled={batchOptions.length === 0}
                aria-label="Graduating batch"
              />
            </label>
          ) : null}
          <label className={`block space-y-1.5 ${tab === "new" ? "sm:col-span-2" : ""}`}>
            <span className="text-sm font-medium text-primary-900">Graduation date *</span>
            <input
              type="date"
              value={graduatedAt}
              onChange={(e) => setGraduatedAt(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 text-sm"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-primary-900">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-secondary-300/80 bg-tertiary-100 px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-secondary-300 px-4 py-2.5 text-sm font-medium text-neutral-800"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Saving…"
            onClick={() => void handleSubmit()}
          >
            Add alumni
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
