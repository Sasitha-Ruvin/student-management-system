import { hmacSha256 } from "@/lib/pii-crypto/keys";

const MIN_TRIGRAM_QUERY = 3;

/** Overlapping character trigrams for blind-index search. */
export function buildNicTrigrams(normalizedNic: string): string[] {
  const s = normalizedNic.trim().toUpperCase();
  if (s.length < MIN_TRIGRAM_QUERY) return [];
  const tokens = new Set<string>();
  for (let i = 0; i <= s.length - MIN_TRIGRAM_QUERY; i++) {
    tokens.add(s.slice(i, i + MIN_TRIGRAM_QUERY));
  }
  return [...tokens];
}

export function hashNicTrigram(trigram: string): string {
  return hmacSha256(`nic:${trigram.toUpperCase()}`);
}

export function hashNicExact(normalizedNic: string): string {
  return hmacSha256(`nic:exact:${normalizedNic.trim().toUpperCase()}`);
}

export function hashNicSearchQuery(query: string): string[] {
  const normalized = query.trim().toUpperCase();
  return buildNicTrigrams(normalized).map(hashNicTrigram);
}

export function canSearchNicByTrigram(query: string): boolean {
  return query.trim().length >= MIN_TRIGRAM_QUERY;
}

export { maskNic } from "@/lib/pii-crypto/masks";
