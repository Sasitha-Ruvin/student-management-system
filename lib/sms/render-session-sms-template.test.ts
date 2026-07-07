import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import {
  buildSessionSmsContext,
  renderSessionSmsTemplate,
} from "@/lib/sms/render-session-sms-template";
import { validateSessionSmsTemplateBody } from "@/lib/sms/session-sms-placeholders";

const baseCtx = buildSessionSmsContext({
  academyName: "The Walk Model Academy",
  studentFirstName: "Sasi",
  sessionNumber: 3,
  batchCode: "COL-2026-MAY",
  batchName: "Colombo May",
  scheduledAt: "2026-05-23T10:00:00.000Z",
  branchName: "Colombo Branch",
  branchLocation: "Main Hall",
  contactPhone: "0776440080",
  notice: "bring your portfolio",
});

describe("validateSessionSmsTemplateBody", () => {
  it("rejects unknown placeholders", () => {
    assert.equal(
      validateSessionSmsTemplateBody("Hi {{firstName}} {{foo}}"),
      "Unknown placeholders: {{foo}}",
    );
  });
});

describe("renderSessionSmsTemplate", () => {
  it("substitutes placeholders and preserves notice casing", () => {
    const body = renderSessionSmsTemplate(
      DEFAULT_SESSION_SMS_TEMPLATE_BODY,
      baseCtx,
    );

    assert.match(body, /The Walk Model Academy/);
    assert.match(body, /Hi Sasi,/);
    assert.match(body, /Session #3 \| COL-2026-MAY/);
    assert.match(body, /Colombo Branch, Main Hall/);
    assert.match(body, /bring your portfolio/);
    assert.doesNotMatch(body, /Questions:/);
  });

  it("strips legacy Questions footer from custom templates", () => {
    const legacyTemplate = `${DEFAULT_SESSION_SMS_TEMPLATE_BODY}

Questions: {{contactPhone}}`;
    const body = renderSessionSmsTemplate(legacyTemplate, baseCtx);
    assert.doesNotMatch(body, /Questions:/);
    assert.match(body, /bring your portfolio/);
  });

  it("truncates long notices while keeping template parts", () => {
    const longNotice = "A".repeat(400);
    const body = renderSessionSmsTemplate(DEFAULT_SESSION_SMS_TEMPLATE_BODY, {
      ...baseCtx,
      notice: longNotice,
    });
    assert.ok(body.length <= 480);
    assert.match(body, /The Walk Model Academy/);
    assert.doesNotMatch(body, /Questions:/);
  });

  it("renders templates without notice placeholder", () => {
    const body = renderSessionSmsTemplate(
      "Hi {{firstName}}, session {{sessionNumber}}.",
      { ...baseCtx, notice: "" },
    );
    assert.equal(body, "Hi Sasi, session 3.");
  });
});
