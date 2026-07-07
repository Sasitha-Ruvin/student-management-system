"use client";

import { useEffect, useMemo, useState } from "react";

import { CreatableSelect } from "@/components/ui/creatable-select";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { StudentDocumentsPanel } from "@/components/students/student-documents-panel";
import { StudentStatusBadge } from "@/components/students/student-status-badge";
import { useBranchesPicker } from "@/contexts/branches-picker-context";
import { useRegistrationOptions } from "@/hooks/use-registration-options";
import { saveStudentEdit, uploadEnrollmentReceipt, fetchStudentDocuments } from "@/lib/api/students";
import { studentPhotoSrc } from "@/lib/students/student-photo-url";
import type {
  StudentDetail,
  StudentEnrollmentStatus,
  UpdateEnrollmentPatch,
  UpdateStudentBody,
} from "@/types/api/student";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const DAY_OPTIONS = [
  { value: "", label: "None" },
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];

const FEE_EDITABLE: StudentEnrollmentStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "ON_HOLD",
];

type EnrollmentFormState = {
  notes: string;
  customCourseFee: string;
  regFeePaid: boolean;
  receiptFile: File | null;
  recalculateOpenInstallments: boolean;
  initialCustomCourseFee: string;
};

type EditStudentModalProps = {
  open: boolean;
  student: StudentDetail;
  onClose: () => void;
  onSuccess: (warnings?: string[]) => void;
  onDocumentsUpdated?: () => void;
};

function dobToInput(iso: string): string {
  return iso.slice(0, 10);
}

export function EditStudentModal({
  open,
  student,
  onClose,
  onSuccess,
  onDocumentsUpdated,
}: EditStudentModalProps) {
  const { branches } = useBranchesPicker();
  const {
    skinColors,
    modelingInterests,
    eyeColors,
    hairColors,
    addEyeColorOption,
    addHairColorOption,
  } = useRegistrationOptions();
  const [documents, setDocuments] = useState(student.documents);

  const [fullName, setFullName] = useState(student.fullName);
  const [email, setEmail] = useState(student.email);
  const [nic, setNic] = useState(student.nic);
  const [dob, setDob] = useState(dobToInput(student.dob));
  const [age, setAge] = useState(String(student.age));
  const [gender, setGender] = useState(student.gender);
  const [contactNumber, setContactNumber] = useState(student.contactNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsappNumber);
  const [sameAsContact, setSameAsContact] = useState(
    student.contactNumber === student.whatsappNumber,
  );
  const [address, setAddress] = useState(student.address);
  const [height, setHeight] = useState(
    student.height !== null ? String(student.height) : "",
  );
  const [weight, setWeight] = useState(
    student.weight !== null ? String(student.weight) : "",
  );
  const [preferredBranchId, setPreferredBranchId] = useState(
    student.preferredBranchId ?? "",
  );
  const [preferredDate, setPreferredDate] = useState(student.preferredDate ?? "");

  const [chest, setChest] = useState(
    student.chest !== null ? String(student.chest) : "",
  );
  const [shoulder, setShoulder] = useState(
    student.shoulder !== null ? String(student.shoulder) : "",
  );
  const [waist, setWaist] = useState(
    student.waist !== null ? String(student.waist) : "",
  );
  const [shoeSize, setShoeSize] = useState(student.shoeSize ?? "");
  const [skinColorOptionId, setSkinColorOptionId] = useState(
    student.skinColorOptionId ?? "",
  );
  const [eyeColor, setEyeColor] = useState(student.eyeColor ?? "");
  const [hairColor, setHairColor] = useState(student.hairColor ?? "");
  const [talents, setTalents] = useState(student.talents ?? "");
  const [modelingInterestIds, setModelingInterestIds] = useState<string[]>(
    student.modelingInterestIds,
  );

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    student.photoUrl,
  );

  const [enrollmentForms, setEnrollmentForms] = useState<
    Record<string, EnrollmentFormState>
  >(() => buildEnrollmentForms(student));

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(student.fullName);
    setEmail(student.email);
    setNic(student.nic);
    setDob(dobToInput(student.dob));
    setAge(String(student.age));
    setGender(student.gender);
    setContactNumber(student.contactNumber);
    setWhatsappNumber(student.whatsappNumber);
    setSameAsContact(student.contactNumber === student.whatsappNumber);
    setAddress(student.address);
    setHeight(student.height !== null ? String(student.height) : "");
    setWeight(student.weight !== null ? String(student.weight) : "");
    setPreferredBranchId(student.preferredBranchId ?? "");
    setPreferredDate(student.preferredDate ?? "");
    setChest(student.chest !== null ? String(student.chest) : "");
    setShoulder(student.shoulder !== null ? String(student.shoulder) : "");
    setWaist(student.waist !== null ? String(student.waist) : "");
    setShoeSize(student.shoeSize ?? "");
    setSkinColorOptionId(student.skinColorOptionId ?? "");
    setEyeColor(student.eyeColor ?? "");
    setHairColor(student.hairColor ?? "");
    setTalents(student.talents ?? "");
    setModelingInterestIds(student.modelingInterestIds);
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoPreview(student.photoUrl);
    setEnrollmentForms(buildEnrollmentForms(student));
    setDocuments(student.documents);
    setError(null);
    setFieldErrors({});
  }, [open, student]);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!dob) return;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return;
    const ageFromDob = Math.floor(
      (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    if (ageFromDob >= 0) setAge(String(ageFromDob));
  }, [dob]);

  const branchOptions = useMemo(
    () => [
      { value: "", label: "None" },
      ...branches.map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches],
  );

  function updateEnrollment(
    enrollmentId: string,
    patch: Partial<EnrollmentFormState>,
  ) {
    setEnrollmentForms((prev) => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], ...patch },
    }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const whatsapp = sameAsContact ? contactNumber : whatsappNumber;

    const enrollments: UpdateEnrollmentPatch[] = student.enrollments.map((e) => {
      const form = enrollmentForms[e.enrollmentId];
      const patch: UpdateEnrollmentPatch = { enrollmentId: e.enrollmentId };

      if (form) {
        patch.notes = form.notes.trim() || null;
        if (FEE_EDITABLE.includes(e.status)) {
          patch.regFeePaid = form.regFeePaid;
          if (form.customCourseFee.trim()) {
            patch.customCourseFee = Number(form.customCourseFee);
          } else {
            patch.customCourseFee = null;
          }
          if (
            form.recalculateOpenInstallments &&
            form.customCourseFee !== form.initialCustomCourseFee
          ) {
            patch.recalculateOpenInstallments = true;
          }
        }
      }
      return patch;
    });

    const body: UpdateStudentBody = {
      fullName,
      email,
      nic,
      dob,
      age: Number(age),
      gender,
      contactNumber,
      whatsappNumber: whatsapp,
      address,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      chest: chest ? Number(chest) : null,
      shoulder: shoulder ? Number(shoulder) : null,
      waist: waist ? Number(waist) : null,
      shoeSize: shoeSize.trim() || null,
      skinColorOptionId: skinColorOptionId || null,
      eyeColor: eyeColor.trim() || null,
      hairColor: hairColor.trim() || null,
      talents: talents.trim() || null,
      modelingInterestIds,
      preferredBranchId: preferredBranchId || null,
      preferredDate: preferredDate || null,
      enrollments,
    };

    try {
      const result = await saveStudentEdit(student.id, body, {
        photo: photoFile,
        removePhoto,
      });

      for (const e of student.enrollments) {
        const form = enrollmentForms[e.enrollmentId];
        if (form?.receiptFile) {
          await uploadEnrollmentReceipt(
            student.id,
            e.enrollmentId,
            form.receiptFile,
          );
        }
      }

      onSuccess(result.warnings);
    } catch (e) {
      const err = e as Error & {
        errors?: Record<string, string>;
        field?: string;
      };
      if (err.errors) {
        setFieldErrors(err.errors);
      }
      setError(err.message ?? "Failed to save changes");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit student" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">Personal</h3>
          <p className="font-mono text-xs text-neutral-600">
            Model code: {student.modelCode} · Source: {student.source}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-neutral-600">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.fullName ? (
                <span className="text-xs text-destructive">{fieldErrors.fullName}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.email ? (
                <span className="text-xs text-destructive">{fieldErrors.email}</span>
              ) : null}
              {student.hasPortalAccount ? (
                <span className="text-xs text-neutral-500">
                  Portal email will be updated in Supabase.
                </span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">NIC</span>
              <input
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.nic ? (
                <span className="text-xs text-destructive">{fieldErrors.nic}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Date of birth</span>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Age</span>
              <input
                type="number"
                min={15}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-neutral-600">Gender</span>
              <Select
                value={gender}
                onChange={setGender}
                options={GENDER_OPTIONS}
                aria-label="Gender"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">Contact</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Phone</span>
              <input
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">WhatsApp</span>
              <input
                value={sameAsContact ? contactNumber : whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                disabled={sameAsContact}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm disabled:opacity-60"
              />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={sameAsContact}
                onChange={(e) => setSameAsContact(e.target.checked)}
                className="size-4 rounded border-secondary-400"
              />
              <span className="text-sm text-neutral-700">Same as phone</span>
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-neutral-600">Address</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">Measurements & preferences</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Height (cm)</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Weight (kg)</span>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Preferred branch</span>
              <Select
                value={preferredBranchId}
                onChange={setPreferredBranchId}
                options={branchOptions}
                aria-label="Preferred branch"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Preferred day</span>
              <Select
                value={preferredDate}
                onChange={setPreferredDate}
                options={DAY_OPTIONS}
                aria-label="Preferred day"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">
            Body measurements & physical features
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Chest (in)</span>
              <input
                type="number"
                min={20}
                max={80}
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.chest ? (
                <span className="text-xs text-destructive">{fieldErrors.chest}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Shoulder (in)</span>
              <input
                type="number"
                min={20}
                max={80}
                value={shoulder}
                onChange={(e) => setShoulder(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.shoulder ? (
                <span className="text-xs text-destructive">{fieldErrors.shoulder}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Waist (in)</span>
              <input
                type="number"
                min={20}
                max={80}
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.waist ? (
                <span className="text-xs text-destructive">{fieldErrors.waist}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Shoe size (UK)</span>
              <input
                value={shoeSize}
                onChange={(e) => setShoeSize(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
              />
              {fieldErrors.shoeSize ? (
                <span className="text-xs text-destructive">{fieldErrors.shoeSize}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-neutral-600">Skin color</span>
              <Select
                value={skinColorOptionId}
                onChange={setSkinColorOptionId}
                options={[
                  { value: "", label: "Select…" },
                  ...skinColors.map((c) => ({ value: c.id, label: c.label })),
                ]}
                aria-label="Skin color"
              />
              {fieldErrors.skinColorOptionId ? (
                <span className="text-xs text-destructive">{fieldErrors.skinColorOptionId}</span>
              ) : null}
            </label>
            <label className="block space-y-1">
              <CreatableSelect
                label="Eye color"
                optional
                value={eyeColor}
                onChange={setEyeColor}
                options={eyeColors.map((option) => option.label)}
                onCreateOption={addEyeColorOption}
                aria-label="Eye color"
              />
            </label>
            <label className="block space-y-1">
              <CreatableSelect
                label="Hair color"
                optional
                value={hairColor}
                onChange={setHairColor}
                options={hairColors.map((option) => option.label)}
                onCreateOption={addHairColorOption}
                aria-label="Hair color"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">Experience & skills</h3>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-neutral-600">Talents & special skills</span>
            <textarea
              value={talents}
              onChange={(e) => setTalents(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 py-2 text-sm"
            />
            {fieldErrors.talents ? (
              <span className="text-xs text-destructive">{fieldErrors.talents}</span>
            ) : null}
          </label>
          {modelingInterests.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-600">Modeling interests</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {modelingInterests.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={modelingInterestIds.includes(option.id)}
                      onChange={() => {
                        setModelingInterestIds((prev) =>
                          prev.includes(option.id)
                            ? prev.filter((id) => id !== option.id)
                            : [...prev, option.id],
                        );
                      }}
                      className="size-4 rounded border-secondary-400"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="font-headline text-lg text-primary-900">Photo</h3>
          <div className="flex flex-wrap items-start gap-4">
            {(() => {
              const displaySrc = photoFile
                ? photoPreview
                : removePhoto
                  ? null
                  : studentPhotoSrc(student.id, student.photoUrl);
              return displaySrc ? (
                <img
                  src={displaySrc}
                  alt=""
                  className="size-20 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-full bg-secondary-200 text-2xl text-neutral-600">
                  {fullName.charAt(0)}
                </span>
              );
            })()}
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPhotoFile(f ?? null);
                  setRemovePhoto(false);
                }}
                className="text-sm"
              />
              {student.photoUrl ? (
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={removePhoto}
                    onChange={(e) => {
                      setRemovePhoto(e.target.checked);
                      if (e.target.checked) {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      } else {
                        setPhotoPreview(student.photoUrl);
                      }
                    }}
                    className="size-4 rounded border-secondary-400"
                  />
                  Remove photo
                </label>
              ) : null}
            </div>
          </div>
        </section>

        {student.enrollments.length > 0 ? (
          <section className="space-y-3">
            <h3 className="font-headline text-lg text-primary-900">Enrollments</h3>
            <p className="text-xs text-neutral-600">
              Fee fields apply to active, suspended, or on-hold enrollments only.
              Changing course fee does not recalculate instalments unless you opt in
              below.
            </p>
            <div className="space-y-3">
              {student.enrollments.map((e) => {
                const form = enrollmentForms[e.enrollmentId];
                const canEditFees = FEE_EDITABLE.includes(e.status);
                if (!form) return null;

                return (
                  <div
                    key={e.enrollmentId}
                    className="rounded-xl border border-secondary-300/50 bg-secondary-100/20 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-primary-900">
                        {e.batchCode ?? "Unassigned"}
                      </span>
                      <StudentStatusBadge status={e.status} />
                      {e.branchName ? (
                        <span className="text-xs text-neutral-600">{e.branchName}</span>
                      ) : null}
                    </div>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-neutral-600">Notes</span>
                      <textarea
                        value={form.notes}
                        onChange={(ev) =>
                          updateEnrollment(e.enrollmentId, { notes: ev.target.value })
                        }
                        rows={2}
                        className="w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 py-2 text-sm"
                      />
                    </label>
                    {canEditFees ? (
                      <>
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-neutral-600">
                            Custom course fee (optional)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.customCourseFee}
                            onChange={(ev) =>
                              updateEnrollment(e.enrollmentId, {
                                customCourseFee: ev.target.value,
                                recalculateOpenInstallments: false,
                              })
                            }
                            placeholder="Batch default"
                            className="min-h-11 w-full rounded-xl border border-secondary-300/60 bg-tertiary-100 px-3 text-sm"
                          />
                        </label>
                        {e.paymentPath === "INSTALLMENT" &&
                        form.customCourseFee !== form.initialCustomCourseFee ? (
                          <label className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={form.recalculateOpenInstallments}
                              disabled={e.totalOwed - e.totalPaid < 0.01}
                              onChange={(ev) =>
                                updateEnrollment(e.enrollmentId, {
                                  recalculateOpenInstallments: ev.target.checked,
                                })
                              }
                              className="mt-1 size-4 rounded border-secondary-400 disabled:opacity-40"
                            />
                            <span className="text-sm text-neutral-700">
                              Recalculate open instalment amounts
                              <span className="mt-0.5 block text-xs text-neutral-500">
                                Scales unpaid lines only; paid instalments are
                                unchanged.
                              </span>
                            </span>
                          </label>
                        ) : null}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.regFeePaid}
                            onChange={(ev) =>
                              updateEnrollment(e.enrollmentId, {
                                regFeePaid: ev.target.checked,
                              })
                            }
                            className="size-4 rounded border-secondary-400"
                          />
                          <span className="text-sm text-primary-900">
                            Registration fee paid
                          </span>
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-medium text-neutral-600">
                            Reg. fee receipt (optional)
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={(ev) =>
                              updateEnrollment(e.enrollmentId, {
                                receiptFile: ev.target.files?.[0] ?? null,
                              })
                            }
                            className="text-sm"
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <StudentDocumentsPanel
          studentId={student.id}
          documents={documents}
          onUpdated={() => {
            void fetchStudentDocuments(student.id).then(setDocuments);
            onDocumentsUpdated?.();
          }}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-secondary-300/50 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Saving…"
            onClick={() => void handleSubmit()}
          >
            Save changes
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}

function buildEnrollmentForms(
  student: StudentDetail,
): Record<string, EnrollmentFormState> {
  const map: Record<string, EnrollmentFormState> = {};
  for (const e of student.enrollments) {
    map[e.enrollmentId] = {
      notes: e.notes ?? "",
      customCourseFee:
        e.customCourseFee !== null ? String(e.customCourseFee) : "",
      initialCustomCourseFee:
        e.customCourseFee !== null ? String(e.customCourseFee) : "",
      regFeePaid: e.regFeePaid,
      receiptFile: null,
      recalculateOpenInstallments: false,
    };
  }
  return map;
}
