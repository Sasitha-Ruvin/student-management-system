import { Pool, type PoolConfig } from "pg";

function isSupabaseHost(connectionString: string): boolean {
  try {
    const url = new URL(connectionString.replace(/^postgresql:/, "http:"));
    const host = url.hostname.toLowerCase();
    return host.includes("supabase.com") || host.includes("supabase.co");
  } catch {
    return false;
  }
}

/** Prefer session/direct URL for scripts; fall back to pooled app URL. */
export function resolveSeedConnectionString(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const pooled = process.env.DATABASE_URL?.trim();
  const connectionString = direct || pooled;

  if (!connectionString) {
    throw new Error(
      "Set DIRECT_URL (session pooler :5432 or db.*.supabase.co) or DATABASE_URL.",
    );
  }

  if (!direct && pooled?.includes("pooler") && pooled.includes(":6543")) {
    console.warn(
      "[db] DIRECT_URL is unset; using transaction pooler DATABASE_URL. " +
        "Set DIRECT_URL to the :5432 session URL for reliable seeds/migrations.",
    );
  }

  return connectionString;
}

export function createPgPool(
  connectionString: string,
  overrides?: Partial<PoolConfig>,
): Pool {
  const config: PoolConfig = {
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
    ...overrides,
  };

  if (isSupabaseHost(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return new Pool(config);
}
