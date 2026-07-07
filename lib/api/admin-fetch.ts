import { CSRF_HEADER } from "@/lib/csrf/constants";
import {
  clearClientCsrfToken,
  getClientCsrfToken,
  readCsrfTokenFromDocument,
  setClientCsrfToken,
} from "@/lib/csrf/client-token";
import { parseJsonResponse } from "@/lib/api/parse-json-response";

export type AdminFetchInit = RequestInit & {
  /** Skip CSRF header (login only). */
  skipCsrf?: boolean;
};

function extractCsrfTokenFromBody(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  if (typeof record.csrfToken === "string" && record.csrfToken) {
    return record.csrfToken;
  }
  const data = record.data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).csrfToken;
    if (typeof nested === "string" && nested) return nested;
  }
  return null;
}

async function refreshCsrfTokenFromServer(): Promise<string | null> {
  const res = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) return getClientCsrfToken();

  const json = (await res.json()) as unknown;
  const token = extractCsrfTokenFromBody(json);
  if (token) {
    setClientCsrfToken(token);
    return token;
  }

  return readCsrfTokenFromDocument();
}

/** Refresh CSRF cookie after login or on dashboard boot. */
export async function refreshCsrfToken(): Promise<void> {
  await refreshCsrfTokenFromServer();
}

async function resolveCsrfToken(skipCsrf: boolean | undefined): Promise<string | null> {
  if (skipCsrf) return null;

  const existing = getClientCsrfToken();
  if (existing) return existing;

  return refreshCsrfTokenFromServer();
}

function isCsrfForbiddenResponse(res: Response, json: unknown): boolean {
  if (res.status !== 403) return false;
  if (!json || typeof json !== "object") return false;
  return (json as { error?: string }).error === "Invalid CSRF token";
}

/**
 * Same-origin fetch for admin portal API routes. Sends CSRF header on mutations.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init: AdminFetchInit = {},
): Promise<Response> {
  const { skipCsrf, headers: initHeaders, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  const isMutation =
    !skipCsrf && method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  async function sendRequest(forceRefresh = false): Promise<Response> {
    const headers = new Headers(initHeaders);

    if (isMutation) {
      const token = forceRefresh
        ? await refreshCsrfTokenFromServer()
        : await resolveCsrfToken(skipCsrf);
      if (token) {
        headers.set(CSRF_HEADER, token);
      }
    }

    return fetch(input, {
      ...rest,
      method,
      headers,
      credentials: "same-origin",
    });
  }

  const res = await sendRequest();

  if (!isMutation || res.status !== 403) return res;

  let json: unknown = null;
  try {
    json = await res.clone().json();
  } catch {
    return res;
  }

  if (isCsrfForbiddenResponse(res, json)) {
    await refreshCsrfTokenFromServer();
    return sendRequest(true);
  }

  return res;
}

export async function adminFetchJson<T>(
  input: RequestInfo | URL,
  init: AdminFetchInit = {},
): Promise<T> {
  const res = await adminFetch(input, init);
  return parseJsonResponse<T>(res);
}

export { clearClientCsrfToken };
