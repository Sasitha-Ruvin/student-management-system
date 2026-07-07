"use client";

import { useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { Image, Trash2, Upload } from "@/lib/icons";
import type { AcademySettingsDto } from "@/types/api/settings";

type BrandingTabProps = {
  settings: AcademySettingsDto;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function BrandingTab({ settings, onUpload, onRemove }: BrandingTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoCacheKey, setLogoCacheKey] = useState(0);

  const hasLogo = Boolean(settings.logoUrl);
  const logoDisplaySrc = hasLogo
    ? `/api/settings/logo?v=${logoCacheKey || settings.updatedAt}`
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setMessage(null);
    try {
      await onUpload(file);
      setLogoCacheKey((k) => k + 1);
      setMessage("Logo uploaded successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    setMessage(null);
    try {
      await onRemove();
      setLogoCacheKey((k) => k + 1);
      setMessage("Logo removed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-secondary-300 bg-secondary-100">
          {hasLogo && logoDisplaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${logoCacheKey}-${settings.updatedAt}`}
              src={logoDisplaySrc}
              alt="Academy logo"
              className="max-h-full max-w-full object-contain"
              onError={() => {
                setMessage(
                  "Logo is saved but could not be loaded. Ensure the Supabase Storage bucket \"branding\" exists.",
                );
              }}
            />
          ) : (
            <Image className="size-10 text-neutral-500" aria-hidden />
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">
            Upload your academy logo. Used on invoices and branded materials.
            PNG, JPEG, WebP, or SVG. Max 2MB.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-900 px-4 py-2.5 text-sm font-medium text-tertiary-100 disabled:opacity-60"
            >
              {isUploading ? (
                <Spinner className="size-4" label="Uploading logo" />
              ) : (
                <Upload className="size-4" />
              )}
              {isUploading ? "Uploading…" : "Upload logo"}
            </button>
            {hasLogo ? (
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => void handleRemove()}
                className="inline-flex items-center gap-2 rounded-xl border border-secondary-400 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-secondary-200 disabled:opacity-60"
              >
                {isRemoving ? (
                  <Spinner className="size-4" label="Removing logo" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {isRemoving ? "Removing…" : "Remove"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {message ? (
        <p
          className={
            message.includes("failed") || message.includes("Failed")
              ? "text-sm text-destructive"
              : "text-sm text-neutral-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
