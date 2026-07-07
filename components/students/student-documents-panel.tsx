"use client";

import { useMemo, useState } from "react";

import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { SubmitButton } from "@/components/ui/submit-button";
import { uploadStudentDocuments } from "@/lib/api/students";
import type { StudentDocumentItem } from "@/types/api/student";

type StudentDocumentsPanelProps = {
  studentId: string;
  documents: StudentDocumentItem[];
  onUpdated: () => void;
  compact?: boolean;
};

function docLabel(doc: StudentDocumentItem): string {
  if (doc.type === "NIC_FRONT") return "NIC — front";
  if (doc.type === "NIC_BACK") return "NIC — back";
  return `Professional photo ${doc.sortOrder}`;
}

export function StudentDocumentsPanel({
  studentId,
  documents,
  onUpdated,
  compact = false,
}: StudentDocumentsPanelProps) {
  const [nicFront, setNicFront] = useState<File | null>(null);
  const [nicFrontPreview, setNicFrontPreview] = useState<string | null>(null);
  const [nicBack, setNicBack] = useState<File | null>(null);
  const [nicBackPreview, setNicBackPreview] = useState<string | null>(null);
  const [professionalPhotos, setProfessionalPhotos] = useState<(File | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [professionalPreviews, setProfessionalPreviews] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingNicFront = documents.find((d) => d.type === "NIC_FRONT");
  const existingNicBack = documents.find((d) => d.type === "NIC_BACK");
  const existingPro = documents.filter((d) => d.type === "PROFESSIONAL_PHOTO");
  const proCount = existingPro.length;

  const pendingProCount = professionalPhotos.filter(Boolean).length;
  const hasPendingUpload = Boolean(nicFront || nicBack || pendingProCount > 0);

  const missingSummary = useMemo(() => {
    const parts: string[] = [];
    if (!existingNicFront) parts.push("NIC front");
    if (!existingNicBack) parts.push("NIC back");
    if (proCount === 0) parts.push("professional photos");
    return parts;
  }, [existingNicFront, existingNicBack, proCount]);

  function setProfessionalPhoto(index: number, file: File | null, preview: string | null) {
    setProfessionalPhotos((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
    setProfessionalPreviews((prev) => {
      const next = [...prev];
      next[index] = preview;
      return next;
    });
  }

  function resetPending() {
    setNicFront(null);
    setNicFrontPreview(null);
    setNicBack(null);
    setNicBackPreview(null);
    setProfessionalPhotos([null, null, null, null, null]);
    setProfessionalPreviews([null, null, null, null, null]);
  }

  async function handleUpload() {
    const proFiles = professionalPhotos.filter((f): f is File => f instanceof File);

    if (!nicFront && !nicBack && proFiles.length === 0) {
      setError("Select at least one file to upload");
      return;
    }

    if (proFiles.length > 0 && proCount + proFiles.length > 5) {
      setError(`Cannot exceed 5 professional photos (${proCount} already on file)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await uploadStudentDocuments(studentId, {
        nicFront: nicFront ?? undefined,
        nicBack: nicBack ?? undefined,
        professionalPhotos: proFiles.length > 0 ? proFiles : undefined,
      });
      resetPending();
      setSuccess("Documents uploaded.");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-headline text-lg text-primary-900">Documents & photos</h2>
          <p className="mt-1 text-sm text-neutral-600">
            NIC copies and professional photos are optional at registration. Add or
            replace them here anytime.
          </p>
        </div>
        {missingSummary.length > 0 ? (
          <span className="rounded-lg border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
            Missing: {missingSummary.join(", ")}
          </span>
        ) : (
          <span className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-900">
            Complete
          </span>
        )}
      </div>

      {documents.length > 0 ? (
        <ul className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="overflow-hidden rounded-xl border border-secondary-300/50 bg-background"
            >
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={docLabel(doc)}
                  className="aspect-[4/3] w-full object-cover"
                />
                <p className="border-t border-secondary-300/40 px-3 py-2 text-sm text-primary-900 underline">
                  {docLabel(doc)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-neutral-600">No documents uploaded yet.</p>
      )}

      {!compact ? (
        <div className="space-y-4 border-t border-secondary-300/40 pt-4">
          <p className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
            Upload or replace
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-primary-900">
                NIC — front{existingNicFront ? " (replace)" : ""}
              </p>
              <FileUploadZone
                previewUrl={nicFrontPreview ?? existingNicFront?.url ?? null}
                onFileSelect={(file, preview) => {
                  setNicFront(file);
                  setNicFrontPreview(preview);
                }}
                title="NIC front"
                description="JPEG or PNG, max 5MB."
                previewShape="rectangle"
                previewAlt="NIC front preview"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-primary-900">
                NIC — back{existingNicBack ? " (replace)" : ""}
              </p>
              <FileUploadZone
                previewUrl={nicBackPreview ?? existingNicBack?.url ?? null}
                onFileSelect={(file, preview) => {
                  setNicBack(file);
                  setNicBackPreview(preview);
                }}
                title="NIC back"
                description="JPEG or PNG, max 5MB."
                previewShape="rectangle"
                previewAlt="NIC back preview"
              />
            </div>
          </div>

          {proCount < 5 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-primary-900">
                Professional photos ({proCount}/5 on file
                {pendingProCount > 0 ? ` · ${pendingProCount} selected` : ""})
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: Math.min(5 - proCount, 5) }, (_, index) => (
                  <div key={index}>
                    <p className="mb-1 text-xs text-neutral-600">New photo {index + 1}</p>
                    <FileUploadZone
                      previewUrl={professionalPreviews[index] ?? null}
                      onFileSelect={(file, preview) =>
                        setProfessionalPhoto(index, file, preview)
                      }
                      title="Professional photo"
                      description="JPEG or PNG, max 5MB."
                      previewShape="rectangle"
                      previewAlt={`Professional photo ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">
              Maximum of 5 professional photos reached. Upload a new NIC image above to
              replace an existing file, or contact support to remove photos.
            </p>
          )}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              {success}
            </p>
          ) : null}

          <SubmitButton
            type="button"
            loading={isSubmitting}
            loadingText="Uploading…"
            disabled={!hasPendingUpload}
            onClick={() => void handleUpload()}
          >
            Upload selected
          </SubmitButton>
        </div>
      ) : null}
    </section>
  );
}
