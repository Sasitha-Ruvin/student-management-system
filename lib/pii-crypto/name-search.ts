import { hmacSha256 } from "@/lib/pii-crypto/keys";

const MIN_TOKEN_LEN = 3;

/** Word tokens from a display name for blind-index search. */
export function buildNameSearchTokens(fullName: string): string[] {
  const tokens = new Set<string>();
  for (const part of fullName.toLowerCase().split(/\s+/)) {
    const w = part.replace(/[^a-z0-9]/gi, "");
    if (w.length >= MIN_TOKEN_LEN) tokens.add(w);
  }
  return [...tokens];
}

export function hashNameToken(token: string): string {
  return hmacSha256(`name:${token.toLowerCase()}`);
}

export function hashNameSearchQuery(query: string): string[] {
  return buildNameSearchTokens(query).map(hashNameToken);
}
