"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreatePortalAccountModal } from "@/components/students/create-portal-account-modal";
import { RegistrationStepAssignment } from "@/components/students/registration-step-assignment";
import { RegistrationStepDocuments } from "@/components/students/registration-step-documents";
import { RegistrationStepExperience } from "@/components/students/registration-step-experience";
import { RegistrationStepMeasurements } from "@/components/students/registration-step-measurements";
import { RegistrationStepPayment } from "@/components/students/registration-step-payment";
import { RegistrationStepPersonal } from "@/components/students/registration-step-personal";
import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { SubmitButton } from "@/components/ui/submit-button";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { prefetchRegistrationOptions } from "@/hooks/use-registration-options";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Measurements" },
  { id: 3, label: "Experience" },
  { id: 4, label: "Assignment" },
  { id: 5, label: "Documents" },
  { id: 6, label: "Payment" },
];

export function StudentRegistrationWizard() {
  const router = useRouter();
  const s = useRegistrationWizardStore();
  const [portalOpen, setPortalOpen] = useState(false);

  useEffect(() => {
    prefetchRegistrationOptions();
  }, []);

  if (s.success) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <h1 className="font-headline text-3xl text-primary-900">Registration complete</h1>
        <p className="text-neutral-700">
          <span className="font-mono font-medium text-primary-900">{s.success.modelCode}</span>{" "}
          assigned to{" "}
          <span className="font-medium">{s.success.batchName}</span> (
          {s.success.batchCode})
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={`/dashboard/students/${s.success.studentId}`}
            className="min-h-11 rounded-xl bg-primary-900 px-5 py-2.5 text-sm font-medium text-tertiary-100"
          >
            View student
          </Link>
          <button
            type="button"
            onClick={() => setPortalOpen(true)}
            className="min-h-11 rounded-xl border border-primary-900 px-5 py-2.5 text-sm font-medium text-primary-900"
          >
            Create portal account
          </button>
          <button
            type="button"
            onClick={() => {
              s.reset();
            }}
            className="min-h-11 rounded-xl border border-secondary-400 px-5 py-2.5 text-sm text-neutral-700"
          >
            Register another
          </button>
        </div>
        {portalOpen && s.success ? (
          <CreatePortalAccountModal
            open
            studentId={s.success.studentId}
            studentName={`${s.firstName} ${s.lastName}`.trim()}
            email={s.success.email}
            contactNumber={s.contactNumber}
            whatsappNumber={s.sameAsContact ? s.contactNumber : s.whatsappNumber}
            onClose={() => setPortalOpen(false)}
            onSuccess={() => {
              setPortalOpen(false);
              router.push(`/dashboard/students/${s.success!.studentId}`);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/students"
            className="text-sm text-neutral-600 hover:text-primary-900"
          >
            ← Back to students
          </Link>
          <h1 className="mt-2 font-headline text-2xl text-primary-900 md:text-3xl">
            Student Registration
          </h1>
        </div>
      </div>

      <WizardStepper steps={STEPS} currentStep={s.step} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {s.step === 1 ? <RegistrationStepPersonal /> : null}
          {s.step === 2 ? <RegistrationStepMeasurements /> : null}
          {s.step === 3 ? <RegistrationStepExperience /> : null}
          {s.step === 4 ? <RegistrationStepAssignment /> : null}
          {s.step === 5 ? <RegistrationStepDocuments /> : null}
          {s.step === 6 ? <RegistrationStepPayment /> : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
            <FileUploadZone
              previewUrl={s.photoPreview}
              onFileSelect={(file, preview) => s.setPhoto(file, preview)}
              title="Profile headshot"
              description="Optional. JPEG or PNG, max 5MB."
            />
          </div>
          <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
            <p className="text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
              Generated Model ID
            </p>
            <p className="mt-2 font-mono text-lg text-primary-900">
              {s.getModelCodePreview()}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              ID will finalize upon successful registration.
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-secondary-300/50 pt-6 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            if (s.step === 1) {
              if (confirm("Discard registration?")) router.push("/dashboard/students");
            } else {
              s.prevStep();
            }
          }}
          className="min-h-11 w-full rounded-xl border border-secondary-400 px-6 py-2.5 text-sm font-medium tracking-wide text-neutral-700 uppercase sm:w-auto"
        >
          {s.step === 1 ? "Cancel" : "Back"}
        </button>
        {s.step < 6 ? (
          <SubmitButton type="button" onClick={() => s.nextStep()}>
            Next step →
          </SubmitButton>
        ) : (
          <SubmitButton
            type="button"
            loading={s.isSubmitting}
            loadingText="Registering…"
            onClick={() => void s.submit()}
          >
            Complete registration
          </SubmitButton>
        )}
      </div>
    </div>
  );
}
