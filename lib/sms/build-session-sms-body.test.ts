import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSessionSmsBody,
  buildSessionSmsPrefix,
} from "@/lib/sms/build-session-sms-body";

const baseInput = {
  sessionNumber: 3,
  batchCode: "COL-2026-MAY",
  batchName: "May 2026 Intake",
  scheduledAt: "2026-05-23T10:00:00.000Z",
  branchName: "Colombo Branch",
  branchLocation: "Main Hall",
  message: "Next session moved to Saturday. Bring your portfolio.",
  contactPhone: "0776440080",
  studentFirstName: "Sasi",
};

describe("buildSessionSmsBody", () => {
  it("includes academy header, session details, and notice", () => {
    const body = buildSessionSmsBody(baseInput);
    assert.ok(body.startsWith("The Walk Model Academy"));
    assert.match(body, /Hi Sasi,/);
    assert.match(body, /Session #3 \| COL-2026-MAY/);
    assert.match(body, /Colombo Branch, Main Hall/);
    assert.match(body, /Next session moved to Saturday/);
    assert.doesNotMatch(body, /Questions:/);
    const noticeIndex = body.indexOf("Next session");
    const sessionIndex = body.indexOf("Session #3");
    assert.ok(sessionIndex < noticeIndex, "session details before notice");
  });

  it("omits branch location when empty", () => {
    const body = buildSessionSmsBody({
      ...baseInput,
      branchLocation: "",
    });
    assert.match(body, /Colombo Branch\n/);
    assert.ok(!body.includes("Colombo Branch, Main"));
  });

  it("truncates long notices while keeping header block", () => {
    const body = buildSessionSmsBody({
      ...baseInput,
      message: "x".repeat(400),
    });
    assert.ok(body.length <= 480);
    assert.ok(body.startsWith("The Walk Model Academy"));
    assert.match(body, /Session #3/);
  });
});

describe("buildSessionSmsPrefix", () => {
  it("does not include admin message", () => {
    const prefix = buildSessionSmsPrefix(baseInput);
    assert.ok(!prefix.includes("Next session"));
    assert.match(prefix, /Session #3/);
  });
});
