"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ChevronDown } from "@/lib/icons";

type CreatableSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onCreateOption?: (label: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  optional?: boolean;
  strict?: boolean;
  variant?: "default" | "underline";
  className?: string;
  "aria-label"?: string;
};

const triggerStyles = {
  default:
    "min-h-11 rounded-xl border border-secondary-400 bg-tertiary-100 px-3 py-2.5 hover:border-secondary-600 focus:border-primary-900",
  underline:
    "min-h-0 rounded-none border-0 border-b border-secondary-400 bg-transparent px-0 py-2 hover:border-primary-900 focus:border-primary-900 focus:ring-0",
} as const;

export function CreatableSelect({
  label,
  value,
  onChange,
  options,
  onCreateOption,
  placeholder = "Select or type…",
  disabled = false,
  loading = false,
  error,
  optional = false,
  strict = false,
  variant = "default",
  className = "",
  "aria-label": ariaLabel,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const normalizedQuery = query.trim();
  const filtered = options.filter((option) =>
    option.toLowerCase().includes(normalizedQuery.toLowerCase()),
  );
  const exactMatch = options.some(
    (option) => option.toLowerCase() === normalizedQuery.toLowerCase(),
  );
  const showCreate =
    !strict &&
    Boolean(normalizedQuery) &&
    !exactMatch &&
    Boolean(onCreateOption) &&
    !loading;

  const updateMenuPosition = () => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
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
  }, [open, query]);

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
      setQuery(value);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery(value);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, value]);

  async function commitValue(next: string) {
    const trimmed = next.trim();
    if (
      strict &&
      trimmed &&
      !options.some((option) => option.toLowerCase() === trimmed.toLowerCase())
    ) {
      setQuery(value);
      setOpen(false);
      return;
    }
    onChange(trimmed);
    setQuery(trimmed);
    setOpen(false);

    if (
      trimmed &&
      onCreateOption &&
      !options.some((option) => option.toLowerCase() === trimmed.toLowerCase())
    ) {
      setCreating(true);
      try {
        await onCreateOption(trimmed);
      } finally {
        setCreating(false);
      }
    }
  }

  function selectOption(option: string) {
    void commitValue(option);
  }

  const menu =
    mounted && open && menuPosition ? (
      <ul
        ref={menuRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel ?? label}
        style={{
          position: "fixed",
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 200,
        }}
        className="max-h-56 overflow-auto rounded-xl border border-secondary-300/80 bg-tertiary-100 py-1 shadow-lg"
      >
        {filtered.length === 0 && !showCreate ? (
          <li className="px-3 py-3 text-sm text-neutral-500">No matches</li>
        ) : (
          filtered.map((option) => (
            <li key={option} role="option" aria-selected={option === value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
                className="flex min-h-11 w-full items-center px-3 py-3 text-left text-sm text-neutral-800 hover:bg-secondary-100"
              >
                {option}
              </button>
            </li>
          ))
        )}
        {showCreate ? (
          <li role="option">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commitValue(normalizedQuery)}
              disabled={creating}
              className="flex min-h-11 w-full items-center px-3 py-3 text-left text-sm font-medium text-primary-900 hover:bg-secondary-100"
            >
              {creating ? "Adding…" : `Add "${normalizedQuery}"`}
            </button>
          </li>
        ) : null}
      </ul>
    ) : null;

  return (
    <div ref={containerRef} className={className}>
      {label ? (
        <label className="mb-1 block text-xs font-medium tracking-wide text-neutral-600 uppercase">
          {label}
          {optional ? (
            <span className="normal-case text-neutral-500"> (optional)</span>
          ) : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled || loading || creating}
          aria-label={ariaLabel ?? label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          role="combobox"
          placeholder={loading ? "Loading…" : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitValue(query);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!menuRef.current?.contains(document.activeElement)) {
                void commitValue(query);
              }
            }, 120);
          }}
          className={[
            "w-full text-left text-sm text-primary-900 transition-colors focus:outline-none",
            triggerStyles[variant],
            disabled || loading ? "cursor-not-allowed opacity-60" : "",
            error ? "border-destructive" : "",
            variant === "default" && open
              ? "border-primary-900 ring-1 ring-primary-900/10"
              : "",
            variant === "underline" && open ? "border-primary-900" : "",
          ].join(" ")}
        />
        <ChevronDown
          className={[
            "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-neutral-600",
            variant === "underline" ? "right-0" : "right-3",
          ].join(" ")}
          aria-hidden
        />
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
