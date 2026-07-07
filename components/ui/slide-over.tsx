"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { X } from "@/lib/icons";

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
}: SlideOverProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-primary-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-secondary-300/60 bg-tertiary-100 shadow-xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-secondary-300/50 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="slide-over-title"
              className="font-headline text-xl text-primary-900"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-neutral-600">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-secondary-200/80"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
