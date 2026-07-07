import { NextResponse } from "next/server";

/** Fresh JSON for admin CRUD/list reads (no HTTP or Next fetch cache). */
export function freshAdminJson<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

/** @deprecated Prefer freshAdminJson for admin APIs. */
export function privateCachedJson<T>(body: T, status = 200, maxAge = 15) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=30`,
    },
  });
}
