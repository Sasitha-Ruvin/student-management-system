"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { X } from "@/lib/icons";

type ModalSize = "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-lg sm:max-w-2xl",
  xl: "max-w-lg sm:max-w-3xl",
  "2xl": "max-w-lg sm:max-w-5xl",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-primary-900/40"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={[
              "relative z-10 flex max-h-[min(92dvh,100vh)] w-full flex-col",
              "rounded-t-2xl border border-secondary-300/60 bg-tertiary-100 shadow-xl",
              "sm:max-h-[min(90dvh,calc(100vh-2rem))] sm:rounded-2xl",
              sizeClasses[size],
            ].join(" ")}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-secondary-300/50 px-4 py-4 sm:px-6 sm:py-5">
              <h2
                id="modal-title"
                className="font-headline text-xl text-primary-900 sm:text-2xl"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-secondary-200 active:bg-secondary-300/80"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:pb-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
