import { describe, expect, it, beforeAll } from "vitest";

import { decryptField, encryptField } from "@/lib/pii-crypto";
import {
  buildNicTrigrams,
  hashNicExact,
  hashNicTrigram,
} from "@/lib/pii-crypto/nic-search";

beforeAll(() => {
  const key = Buffer.alloc(32, 7).toString("base64");
  process.env.DATA_ENCRYPTION_KEY = key;
  process.env.SEARCH_HMAC_KEY = Buffer.alloc(32, 3).toString("base64");
});

describe("encrypt/decrypt", () => {
  it("round-trips plaintext", () => {
    const plain = "200115307989";
    expect(decryptField(encryptField(plain))).toBe(plain);
  });
});

describe("nic search", () => {
  it("builds trigrams", () => {
    expect(buildNicTrigrams("200115307989")).toContain("200");
    expect(buildNicTrigrams("20").length).toBe(0);
  });

  it("stable nic hash", () => {
    expect(hashNicExact("200115307989")).toBe(hashNicExact("200115307989"));
    expect(hashNicTrigram("200")).toBe(hashNicTrigram("200"));
  });
});
