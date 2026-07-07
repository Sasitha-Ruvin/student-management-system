import { adminFetch, clearClientCsrfToken } from "@/lib/api/admin-fetch";

export type LogoutResult =
  | { ok: true }
  | { ok: false; error: string };

export async function logout(): Promise<LogoutResult> {
  const response = await adminFetch("/api/auth/logout", { method: "POST" });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not sign out. Please try again.",
    };
  }

  clearClientCsrfToken();
  return { ok: true };
}
