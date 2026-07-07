import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyCreditToAmountLines } from "@/lib/payments/apply-transfer-credit";

describe("applyCreditToAmountLines", () => {
  it("reduces from first instalment onward", () => {
    const { lines, applied } = applyCreditToAmountLines(
      [
        { order: 0, amount: 5000 },
        { order: 1, amount: 5000 },
      ],
      7000,
    );
    assert.equal(applied, 7000);
    assert.equal(lines[0].amount, 0);
    assert.equal(lines[1].amount, 3000);
  });
});
