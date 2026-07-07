/**
 * Fixed-window counter stored on globalThis for Edge middleware isolates.
 * Best-effort on Vercel (per edge region/isolate). No network calls — zero added latency.
 */

type WindowEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __walkAdminRateLimitStore: Map<string, WindowEntry> | undefined;
}

const store = globalThis.__walkAdminRateLimitStore ?? new Map<string, WindowEntry>();
if (!globalThis.__walkAdminRateLimitStore) {
  globalThis.__walkAdminRateLimitStore = store;
}

const MAX_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (store.size > MAX_KEYS && Math.random() < 0.02) {
    for (const [k, entry] of store) {
      if (now >= entry.resetAt) store.delete(k);
    }
  }

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return { allowed, limit, remaining, retryAfterSec };
}
