import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";

describe("normalizeSriLankaMobile", () => {
  it("normalizes 07xxxxxxxx to 94xxxxxxxx", () => {
    assert.equal(normalizeSriLankaMobile("077 123 4567"), "94771234567");
  });

  it("accepts +94 format", () => {
    assert.equal(normalizeSriLankaMobile("+94 71 234 5678"), "94712345678");
  });

  it("accepts 94 without plus", () => {
    assert.equal(normalizeSriLankaMobile("94712345678"), "94712345678");
  });

  it("returns null for invalid numbers", () => {
    assert.equal(normalizeSriLankaMobile(""), null);
    assert.equal(normalizeSriLankaMobile("12345"), null);
    assert.equal(normalizeSriLankaMobile(null), null);
  });
});
