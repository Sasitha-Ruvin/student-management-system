"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MoreVertical } from "@/lib/icons";

export type SessionMenuAction =
  | "edit"
  | "update-details"
  | "reschedule"
  | "pin"
  | "complete"
  | "cancel"
  | "attendance";

type SessionActionMenuProps = {
  onAction: (action: SessionMenuAction) => void;
  disabled?: boolean;
  sessionStatus?: string;
};

export function SessionActionMenu({ onAction, disabled, sessionStatus }: SessionActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right - 180 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const isEditable =
    sessionStatus !== "CANCELLED" && sessionStatus !== "COMPLETED";

  const items = [
    { id: "update-details" as const, label: "Edit session", hidden: !isEditable },
    { id: "edit" as const, label: "Message students", hidden: sessionStatus === "CANCELLED" },
    { id: "reschedule" as const, label: "Reschedule", hidden: !isEditable },
    { id: "pin" as const, label: "Set PIN" },
    { id: "complete" as const, label: "Mark completed" },
    { id: "cancel" as const, label: "Cancel session", danger: true as const },
  ].filter((item) => !item.hidden);

  const menu =
    open && pos ? (
      <div
        ref={menuRef}
        role="menu"
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 200 }}
        className="min-w-[180px] rounded-xl border border-secondary-300/80 bg-tertiary-100 py-1 shadow-lg"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onAction(item.id);
            }}
            className={[
              "flex min-h-10 w-full px-3 py-2 text-left text-sm transition-colors hover:bg-secondary-100",
              item.danger ? "text-destructive" : "text-primary-900",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Session actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-10 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-secondary-200 disabled:opacity-50"
      >
        <MoreVertical className="size-5" />
      </button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}

