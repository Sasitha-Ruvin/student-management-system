"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MoreVertical } from "@/lib/icons";

type ActionMenuProps = {
  children: React.ReactNode;
  align?: "left" | "right";
  triggerLabel?: string;
};

type MenuPosition = {
  top: number;
  left?: number;
  right?: number;
};

export function ActionMenu({
  children,
  align = "right",
  triggerLabel = "More actions",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (align === "right") {
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    } else {
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
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
  }, [open, align]);

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

  const menu =
    mounted && open && menuPosition ? (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        style={{
          position: "fixed",
          top: menuPosition.top,
          left: menuPosition.left,
          right: menuPosition.right,
          zIndex: 200,
        }}
        className="min-w-[11rem] rounded-xl border border-secondary-300 bg-tertiary-100 py-1 shadow-lg"
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-10 items-center justify-center rounded-lg border border-transparent text-neutral-700 transition-colors hover:border-secondary-300 hover:bg-secondary-100 active:bg-secondary-200/80 sm:size-11 sm:rounded-xl"
      >
        <MoreVertical className="size-5" />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export function ActionMenuItem({
  children,
  className = "",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        "block w-full px-4 py-3 text-left text-sm text-neutral-800 transition-colors hover:bg-secondary-200 active:bg-secondary-300/80",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionMenuLink({
  children,
  className = "",
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      role="menuitem"
      className={[
        "block px-4 py-3 text-sm text-neutral-800 transition-colors hover:bg-secondary-200 active:bg-secondary-300/80",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </a>
  );
}
