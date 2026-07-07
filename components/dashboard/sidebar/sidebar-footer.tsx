"use client";

import { APP_VERSION, COMPANY_NAME } from "@/lib/app-meta";

type SidebarFooterProps = {
  collapsed: boolean;
};

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  if (collapsed) {
    return (
      <p
        className="px-2 pb-3 text-center text-[10px] font-medium tracking-wide text-neutral-500"
        title={`${COMPANY_NAME} · v${APP_VERSION}`}
      >
        v{APP_VERSION}
      </p>
    );
  }

  return (
    <div className="mx-3 mb-3 border-t border-secondary-300/50 px-1 pt-3">
      <p className="text-center text-[10px] leading-relaxed tracking-wide text-neutral-500">
        <span className="text-neutral-600">{COMPANY_NAME}</span>
        <span className="mx-1.5 text-neutral-400" aria-hidden>
          ·
        </span>
        <span>v{APP_VERSION}</span>
      </p>
    </div>
  );
}
