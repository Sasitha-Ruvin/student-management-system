import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateRasterImageMagicBytes } from "@/lib/storage/image-magic-bytes";

describe("validateRasterImageMagicBytes", () => {
  it("accepts PNG magic bytes", () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(validateRasterImageMagicBytes(buffer, "image/png"), true);
  });

  it("accepts JPEG magic bytes", () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    assert.equal(validateRasterImageMagicBytes(buffer, "image/jpeg"), true);
  });

  it("accepts WebP magic bytes", () => {
    const buffer = Buffer.alloc(12);
    buffer.write("RIFF", 0);
    buffer.write("WEBP", 8);
    assert.equal(validateRasterImageMagicBytes(buffer, "image/webp"), true);
  });

  it("rejects mismatched content", () => {
    const buffer = Buffer.from("<svg></svg>");
    assert.equal(validateRasterImageMagicBytes(buffer, "image/png"), false);
  });
});
