"use client";

import { useCallback, useRef, useState } from "react";

import { Image } from "@/lib/icons";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png"]);

type FileUploadZoneProps = {
  previewUrl: string | null;
  onFileSelect: (file: File | null, previewUrl: string | null) => void;
  error?: string;
  title?: string;
  description?: string;
  previewAlt?: string;
  previewShape?: "circle" | "rectangle";
};

export function FileUploadZone({
  previewUrl,
  onFileSelect,
  error,
  title = "Upload Headshot",
  description = "Drag and drop a high-resolution image, or click to browse. Max 5MB (JPEG or PNG).",
  previewAlt = "Preview",
  previewShape = "circle",
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        onFileSelect(null, null);
        return;
      }
      if (!ALLOWED.has(file.type)) {
        onFileSelect(null, null);
        return;
      }
      if (file.size > MAX_SIZE) {
        onFileSelect(null, null);
        return;
      }
      const url = URL.createObjectURL(file);
      onFileSelect(file, url);
    },
    [onFileSelect],
  );

  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-colors",
        dragOver ? "border-primary-900 bg-secondary-100/50" : "border-secondary-400",
        error ? "border-destructive" : "",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          handleFile(file);
        }}
      />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={previewAlt}
          className={[
            "mb-3 size-24 object-cover",
            previewShape === "circle" ? "rounded-full" : "rounded-lg",
          ].join(" ")}
        />
      ) : (
        <Image className="mb-3 size-10 text-neutral-500" aria-hidden />
      )}
      <p className="font-headline text-lg text-primary-900">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-neutral-600">{description}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 min-h-10 rounded-lg border border-primary-900 px-4 py-2 text-xs font-medium tracking-wide text-primary-900 uppercase"
      >
        Select file
      </button>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
