import { create } from "zustand";

import { refreshCsrfToken } from "@/lib/api/admin-fetch";
import {
  assignStudentToBatch,
  createStudent,
  uploadEnrollmentReceipt,
  uploadStudentDocuments,
} from "@/lib/api/students";
import {
  paymentStructureToAssignBody,
  validatePaymentStructure,
} from "@/lib/payments/enrollment-payment-fields";
import { resolveEnrollmentCourseFee } from "@/lib/payments/resolve-enrollment-course-fee";
import { isCityInProvinceList } from "@/lib/locations/sri-lanka";
import { validateNic } from "@/lib/students/nic-validator";
import {
  initialPaymentStructure,
  type PaymentStructureValue,
} from "@/types/api/payment-enrollment";
import type {
  CustomInstallmentInput,
  EnrollmentInstallmentSource,
  EnrollmentPaymentPath,
} from "@/types/api/student";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type SubmitSuccess = {
  studentId: string;
  modelCode: string;
  batchCode: string;
  batchName: string;
  email: string;
};

type RegistrationWizardState = {
  step: WizardStep;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  email: string;
  nic: string;
  contactNumber: string;
  whatsappNumber: string;
  sameAsContact: boolean;
  street: string;
  city: string;
  stateRegion: string;
  zipCode: string;
  photo: File | null;
  photoPreview: string | null;
  height: string;
  weight: string;
  age: string;
  chest: string;
  shoulder: string;
  waist: string;
  shoeSize: string;
  skinColorOptionId: string;
  eyeColor: string;
  hairColor: string;
  talents: string;
  modelingInterestIds: string[];
  nicFront: File | null;
  nicFrontPreview: string | null;
  nicBack: File | null;
  nicBackPreview: string | null;
  professionalPhotos: (File | null)[];
  professionalPhotoPreviews: (string | null)[];
  preferredBranchId: string;
  preferredDate: string;
  batchId: string;
  batchPricing: {
    courseFee: number;
    oneTimeDiscountAmount: number;
    oneTimePrice: number;
  } | null;
  paymentPath: EnrollmentPaymentPath;
  installmentSource: EnrollmentInstallmentSource;
  paymentPlanId: string | null;
  customInstallments: CustomInstallmentInput[];
  customCourseFee: string;
  regFeePaid: boolean;
  receipt: File | null;
  fieldErrors: Record<string, string>;
  warnings: string[];
  isSubmitting: boolean;
  submitError: string | null;
  partialStudentId: string | null;
  success: SubmitSuccess | null;

  setField: (key: string, value: unknown) => void;
  setPhoto: (file: File | null, preview: string | null) => void;
  setNicFront: (file: File | null, preview: string | null) => void;
  setNicBack: (file: File | null, preview: string | null) => void;
  setProfessionalPhoto: (index: number, file: File | null, preview: string | null) => void;
  syncAgeFromDob: () => void;
  validateStep: (step: WizardStep) => boolean;
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: WizardStep) => void;
  getModelCodePreview: () => string;
  buildFormData: () => FormData;
  submit: () => Promise<boolean>;
  reset: () => void;
};

const INITIAL = {
  step: 1 as WizardStep,
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  email: "",
  nic: "",
  contactNumber: "",
  whatsappNumber: "",
  sameAsContact: false,
  street: "",
  city: "",
  stateRegion: "",
  zipCode: "",
  photo: null as File | null,
  photoPreview: null as string | null,
  height: "",
  weight: "",
  age: "",
  chest: "",
  shoulder: "",
  waist: "",
  shoeSize: "",
  skinColorOptionId: "",
  eyeColor: "",
  hairColor: "",
  talents: "",
  modelingInterestIds: [] as string[],
  nicFront: null as File | null,
  nicFrontPreview: null as string | null,
  nicBack: null as File | null,
  nicBackPreview: null as string | null,
  professionalPhotos: [null, null, null, null, null] as (File | null)[],
  professionalPhotoPreviews: [null, null, null, null, null] as (string | null)[],
  preferredBranchId: "",
  preferredDate: "",
  batchId: "",
  batchPricing: null,
  ...initialPaymentStructure(),
  regFeePaid: false,
  receipt: null as File | null,
  fieldErrors: {} as Record<string, string>,
  warnings: [] as string[],
  isSubmitting: false,
  submitError: null as string | null,
  partialStudentId: null as string | null,
  success: null as SubmitSuccess | null,
};

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  return Math.floor(
    (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
}

function isPhone(val: string): boolean {
  const digits = val.replace(/[^0-9]/g, "");
  return /^[0-9+]+$/.test(val.trim()) && digits.length >= 9 && digits.length <= 15;
}

function validateInches(
  errors: Record<string, string>,
  key: string,
  value: string,
  label: string,
) {
  if (!value) return;
  const n = Number(value);
  if (isNaN(n) || n < 20 || n > 80) {
    errors[key] = `${label} must be 20–80 inches`;
  }
}

export const useRegistrationWizardStore = create<RegistrationWizardState>(
  (set, get) => ({
    ...INITIAL,

    setField: (key, value) => {
      set((s) => {
        const next = { ...s, [key]: value, fieldErrors: { ...s.fieldErrors } };
        delete next.fieldErrors[key];
        if (key === "sameAsContact" && value === true) {
          next.whatsappNumber = s.contactNumber;
        }
        if (key === "contactNumber" && s.sameAsContact) {
          next.whatsappNumber = value as string;
        }
        if (key === "dob" && typeof value === "string") {
          next.age = String(ageFromDob(value));
        }
        if (key === "stateRegion" && typeof value === "string") {
          if (s.city && !isCityInProvinceList(s.city, value)) {
            next.city = "";
          }
        }
        return next;
      });
    },

    setPhoto: (file, preview) => set({ photo: file, photoPreview: preview }),

    setNicFront: (file, preview) =>
      set((s) => {
        const fieldErrors = { ...s.fieldErrors };
        delete fieldErrors.nicFront;
        return { nicFront: file, nicFrontPreview: preview, fieldErrors };
      }),

    setNicBack: (file, preview) =>
      set((s) => {
        const fieldErrors = { ...s.fieldErrors };
        delete fieldErrors.nicBack;
        return { nicBack: file, nicBackPreview: preview, fieldErrors };
      }),

    setProfessionalPhoto: (index, file, preview) =>
      set((s) => {
        const photos = [...s.professionalPhotos];
        const previews = [...s.professionalPhotoPreviews];
        photos[index] = file;
        previews[index] = preview;
        const fieldErrors = { ...s.fieldErrors };
        delete fieldErrors.professionalPhotos;
        return {
          professionalPhotos: photos,
          professionalPhotoPreviews: previews,
          fieldErrors,
        };
      }),

    syncAgeFromDob: () => {
      const { dob } = get();
      if (dob) set({ age: String(ageFromDob(dob)) });
    },

    validateStep: (step) => {
      const s = get();
      const errors: Record<string, string> = {};
      const warnings: string[] = [];

      if (step === 1) {
        if (!s.firstName.trim() || s.firstName.trim().length < 2) {
          errors.firstName = "First name is required";
        }
        if (!s.lastName.trim() || s.lastName.trim().length < 2) {
          errors.lastName = "Last name is required";
        }
        if (!s.dob) errors.dob = "Date of birth is required";
        else {
          const d = new Date(s.dob);
          if (d >= new Date()) errors.dob = "Date of birth cannot be in the future";
        }
        if (!s.gender) errors.gender = "Gender is required";
        if (!s.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
          errors.email = "Valid email is required";
        }
        const nicResult = validateNic(s.nic);
        if (!nicResult.valid) errors.nic = nicResult.error ?? "Invalid NIC";
        if (!isPhone(s.contactNumber)) errors.contactNumber = "Valid phone required";
        const wa = s.sameAsContact ? s.contactNumber : s.whatsappNumber;
        if (!isPhone(wa)) errors.whatsappNumber = "Valid WhatsApp number required";
        if (s.street.trim() && s.street.trim().length < 3) {
          errors.street = "Street must be at least 3 characters when provided";
        }
      }

      if (step === 2) {
        if (!s.age || Number(s.age) <= 0) errors.age = "Age is required";
        if (s.dob && s.age) {
          const derived = ageFromDob(s.dob);
          if (Math.abs(Number(s.age) - derived) > 1) {
            warnings.push(
              `Age (${s.age}) doesn't match date of birth (${derived}). Please verify.`,
            );
          }
        }
        if (s.height && (Number(s.height) < 50 || Number(s.height) > 300)) {
          errors.height = "Height must be 50–300 cm";
        }
        if (s.weight && (Number(s.weight) < 10 || Number(s.weight) > 500)) {
          errors.weight = "Weight must be 10–500 kg";
        }
        validateInches(errors, "chest", s.chest, "Chest");
        validateInches(errors, "shoulder", s.shoulder, "Shoulder");
        validateInches(errors, "waist", s.waist, "Waist");
      }

      if (step === 3) {
        if (s.talents.length > 2000) errors.talents = "Talents must be 2000 characters or fewer";
      }

      if (step === 4) {
        if (!s.batchId) errors.batchId = "Select a batch";
      }

      if (step === 5) {
        const proCount = s.professionalPhotos.filter(Boolean).length;
        if (proCount > 5) {
          errors.professionalPhotos = "Maximum 5 professional photos";
        }
      }

      if (step === 6) {
        const paymentValue: PaymentStructureValue = {
          paymentPath: s.paymentPath,
          installmentSource: s.installmentSource,
          paymentPlanId: s.paymentPlanId,
          customInstallments: s.customInstallments,
          customCourseFee: s.customCourseFee,
        };
        const paymentError = validatePaymentStructure(paymentValue);
        if (paymentError) {
          errors.customCourseFee = paymentError;
        }
      }

      set({ fieldErrors: errors, warnings });
      return Object.keys(errors).length === 0;
    },

    nextStep: () => {
      const { step, validateStep } = get();
      if (!validateStep(step)) return false;
      if (step < 6) set({ step: (step + 1) as WizardStep });
      return true;
    },

    prevStep: () => {
      const { step } = get();
      if (step > 1) set({ step: (step - 1) as WizardStep });
    },

    goToStep: (step) => set({ step }),

    getModelCodePreview: () => {
      const year = new Date().getFullYear();
      return `MOD-${year}-PENDING`;
    },

    buildFormData: () => {
      const s = get();
      const fd = new FormData();
      const fullName = `${s.firstName} ${s.lastName}`.trim();
      const address = [s.street, s.city, s.stateRegion, s.zipCode]
        .filter(Boolean)
        .join(", ");
      const whatsapp = s.sameAsContact ? s.contactNumber : s.whatsappNumber;

      fd.set("fullName", fullName);
      fd.set("email", s.email.toLowerCase().trim());
      fd.set("nic", validateNic(s.nic).normalised);
      fd.set("dob", s.dob);
      fd.set("age", s.age);
      fd.set("gender", s.gender);
      fd.set("contactNumber", s.contactNumber);
      fd.set("whatsappNumber", whatsapp);
      fd.set("address", address);
      if (s.height) fd.set("height", s.height);
      if (s.weight) fd.set("weight", s.weight);
      if (s.chest) fd.set("chest", s.chest);
      if (s.shoulder) fd.set("shoulder", s.shoulder);
      if (s.waist) fd.set("waist", s.waist);
      if (s.shoeSize) fd.set("shoeSize", s.shoeSize);
      if (s.skinColorOptionId) fd.set("skinColorOptionId", s.skinColorOptionId);
      if (s.eyeColor) fd.set("eyeColor", s.eyeColor);
      if (s.hairColor) fd.set("hairColor", s.hairColor);
      if (s.talents) fd.set("talents", s.talents);
      fd.set("modelingInterestIds", JSON.stringify(s.modelingInterestIds));
      if (s.preferredBranchId) fd.set("preferredBranchId", s.preferredBranchId);
      if (s.preferredDate) fd.set("preferredDate", s.preferredDate);
      if (s.photo) fd.set("photo", s.photo);
      return fd;
    },

    submit: async () => {
      const s = get();
      if (!s.validateStep(6)) return false;

      set({ isSubmitting: true, submitError: null, partialStudentId: null });

      const proPhotos = s.professionalPhotos.filter(
        (f): f is File => f instanceof File,
      );

      try {
        await refreshCsrfToken();

        const { student, warnings: apiWarnings } = await createStudent(
          s.buildFormData(),
        );

        try {
          const docInput: {
            nicFront?: File;
            nicBack?: File;
            professionalPhotos?: File[];
          } = {};
          if (s.nicFront) docInput.nicFront = s.nicFront;
          if (s.nicBack) docInput.nicBack = s.nicBack;
          if (proPhotos.length > 0) docInput.professionalPhotos = proPhotos;

          if (Object.keys(docInput).length > 0) {
            await uploadStudentDocuments(student.id, docInput);
          }
        } catch (docErr) {
          const msg =
            docErr instanceof Error ? docErr.message : "Document upload failed";
          set({
            submitError: `${msg} Student was created — upload documents from their profile.`,
            partialStudentId: student.id,
            isSubmitting: false,
          });
          return false;
        }

        const customCourseFee = resolveEnrollmentCourseFee(
          s.paymentPath,
          s.customCourseFee,
          s.batchPricing,
        );

        const paymentValue: PaymentStructureValue = {
          paymentPath: s.paymentPath,
          installmentSource: s.installmentSource,
          paymentPlanId: s.paymentPlanId,
          customInstallments: s.customInstallments,
          customCourseFee: s.customCourseFee,
        };

        try {
          const assignResult = await assignStudentToBatch(
            student.id,
            {
              ...paymentStructureToAssignBody(s.batchId, paymentValue, {
                regFeePaid: s.regFeePaid,
              }),
              customCourseFee,
            },
          );

          const extraWarnings: string[] = [];
          if (s.regFeePaid && s.receipt) {
            try {
              await uploadEnrollmentReceipt(student.id, assignResult.enrollmentId, s.receipt);
            } catch {
              extraWarnings.push("Receipt upload failed — you can re-upload from the student profile.");
            }
          }

          set({
            success: {
              studentId: student.id,
              modelCode: student.modelCode,
              batchCode: assignResult.batchCode,
              batchName: assignResult.batchName,
              email: student.email,
            },
            warnings: [...s.warnings, ...(apiWarnings ?? []), ...extraWarnings],
            isSubmitting: false,
          });
          return true;
        } catch (assignErr) {
          const msg =
            assignErr instanceof Error
              ? assignErr.message
              : "Batch assignment failed";
          set({
            submitError: `${msg} Student was created — assign from their profile.`,
            partialStudentId: student.id,
            isSubmitting: false,
          });
          return false;
        }
      } catch (e) {
        const err = e as Error & { field?: string; errors?: Record<string, string> };
        if (err.errors) {
          set({ fieldErrors: err.errors, submitError: err.message, isSubmitting: false });
        } else if (err.field) {
          set({
            fieldErrors: { [err.field]: err.message },
            submitError: err.message,
            isSubmitting: false,
          });
        } else {
          set({ submitError: err.message, isSubmitting: false });
        }
        return false;
      }
    },

    reset: () => set({ ...INITIAL }),
  }),
);
