"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Check, ChevronDown } from "@/lib/icons";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectVariant = "default" | "ghost" | "underline";

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** `ghost` — borderless trigger for use inside a bordered pill (e.g. toolbar filters) */
  variant?: SelectVariant;
  className?: string;
  /** Applied to the trigger button (underline variant) */
  triggerClassName?: string;
  "aria-label"?: string;
};

const triggerStyles: Record<SelectVariant, string> = {
  default: [
    "min-h-11 rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5",
    "hover:border-secondary-600 focus:border-primary-900",
  ].join(" "),
  ghost: [
    "min-h-11 rounded-lg border-0 bg-transparent px-2 py-2 shadow-none",
    "hover:bg-secondary-200/60 focus:ring-0",
  ].join(" "),
  underline: [
    "min-h-0 rounded-none border-0 border-b border-secondary-400 bg-transparent px-0 py-2",
    "hover:border-primary-900 focus:border-primary-900 focus:ring-0",
  ].join(" "),
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  variant = "default",
  className = "",
  triggerClassName = "",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  const menu =
    mounted && open && menuPosition ? (
      <AnimatePresence>
        <motion.ul
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 200,
          }}
          className="max-h-56 overflow-auto rounded-xl border border-secondary-300/80 bg-tertiary-100 py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-3 text-sm text-neutral-500">No options available</li>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value || "__empty"} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => selectOption(option.value)}
                    className={[
                      "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm transition-colors active:bg-secondary-300/60",
                      isSelected
                        ? "bg-secondary-200/80 font-medium text-primary-900"
                        : "text-neutral-800 hover:bg-secondary-100",
                    ].join(" ")}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="size-4 shrink-0 text-primary-900" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </motion.ul>
      </AnimatePresence>
    ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "flex w-full items-center justify-between gap-2 text-left text-sm transition-colors focus:outline-none",
          triggerStyles[variant],
          triggerClassName,
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          variant === "default" && open
            ? "border-primary-900 ring-1 ring-primary-900/10"
            : "",
          variant === "ghost" && open ? "bg-secondary-200/60" : "",
          variant === "underline" && open ? "border-primary-900" : "",
        ].join(" ")}
      >
        <span
          className={[
            "truncate",
            selected ? "text-primary-900" : "text-neutral-500",
          ].join(" ")}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={[
            "size-4 shrink-0 text-neutral-600 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
