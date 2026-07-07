import { X_ROBOTS_TAG } from "./constants";

const isProduction = process.env.NODE_ENV === "production";

/** Shared HTTP security headers for next.config `headers()`. */
export const BASE_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Robots-Tag", value: X_ROBOTS_TAG },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
] as const;

export const API_SECURITY_HEADERS = [
  { key: "X-Robots-Tag", value: X_ROBOTS_TAG },
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, private",
  },
  { key: "Pragma", value: "no-cache" },
] as const;
