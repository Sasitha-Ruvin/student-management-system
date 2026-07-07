"use client";

import { useEffect } from "react";

import { refreshCsrfToken } from "@/lib/api/admin-fetch";

/** Ensures a CSRF cookie exists for authenticated dashboard sessions. */
export function CsrfBootstrap() {
  useEffect(() => {
    void refreshCsrfToken().catch(() => {
      // ignore — login flow sets token; unauthenticated users redirect away
    });
  }, []);

  return null;
}
