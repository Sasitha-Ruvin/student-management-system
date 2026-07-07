"use client";

import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

export function RegistrationStepDocuments() {
  const s = useRegistrationWizardStore();
  const proCount = s.professionalPhotos.filter(Boolean).length;

  return (
    <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <div>
        <h2 className="font-headline text-xl text-primary-900">Documents & Photos</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Optional — you can skip this step and upload NIC copies and professional
          photos later from the student profile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-primary-900">
            NIC — front side <span className="text-neutral-500">(optional)</span>
          </p>
          <FileUploadZone
            previewUrl={s.nicFrontPreview}
            onFileSelect={(file, preview) => s.setNicFront(file, preview)}
            title="NIC front"
            description="JPEG or PNG, max 5MB."
            previewShape="rectangle"
            previewAlt="NIC front preview"
          />
          {s.fieldErrors.nicFront ? (
            <p className="mt-1 text-xs text-destructive">{s.fieldErrors.nicFront}</p>
          ) : null}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-primary-900">
            NIC — back side <span className="text-neutral-500">(optional)</span>
          </p>
          <FileUploadZone
            previewUrl={s.nicBackPreview}
            onFileSelect={(file, preview) => s.setNicBack(file, preview)}
            title="NIC back"
            description="JPEG or PNG, max 5MB."
            previewShape="rectangle"
            previewAlt="NIC back preview"
          />
          {s.fieldErrors.nicBack ? (
            <p className="mt-1 text-xs text-destructive">{s.fieldErrors.nicBack}</p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-primary-900">
          Professional photos{" "}
          <span className="text-neutral-500">(optional, up to 5)</span>
          {proCount > 0 ? ` · ${proCount} selected` : ""}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index}>
              <p className="mb-2 text-xs text-neutral-600">Photo {index + 1}</p>
              <FileUploadZone
                previewUrl={s.professionalPhotoPreviews[index] ?? null}
                onFileSelect={(file, preview) =>
                  s.setProfessionalPhoto(index, file, preview)
                }
                title="Professional photo"
                description="JPEG or PNG, max 5MB."
                previewShape="rectangle"
                previewAlt={`Professional photo ${index + 1}`}
              />
            </div>
          ))}
        </div>
        {s.fieldErrors.professionalPhotos ? (
          <p className="mt-2 text-xs text-destructive">{s.fieldErrors.professionalPhotos}</p>
        ) : null}
      </div>
    </div>
  );
}
