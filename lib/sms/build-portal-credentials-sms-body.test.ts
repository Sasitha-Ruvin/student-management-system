import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalCredentialsSmsBody } from "@/lib/sms/build-portal-credentials-sms-body";

describe("buildPortalCredentialsSmsBody", () => {
  it("includes academy header, greeting, credentials, and questions line", () => {
    const body = buildPortalCredentialsSmsBody({
      studentFirstName: "Sasi",
      studentEmail: "sasi@example.com",
      password: "Abc12345",
      loginUrl: "https://portal.example.com/login",
      contactPhone: "0776440080",
    });

    assert.match(body, /The Walk Model Academy/);
    assert.match(body, /Hi Sasi,/);
    assert.match(body, /Your student portal account is ready/);
    assert.match(body, /Email: sasi@example.com/);
    assert.match(body, /Password: Abc12345/);
    assert.match(body, /Student Portal: https:\/\/portal\.example\.com\/login/);
    assert.match(body, /Keep your password private\./);
    assert.match(body, /Questions: 0776440080/);
  });

  it("omits questions line when academy phone is not set", () => {
    const body = buildPortalCredentialsSmsBody({
      studentFirstName: "Alex",
      studentEmail: "alex@example.com",
      password: "Pass1234",
      loginUrl: "https://portal.example.com/login",
      contactPhone: null,
    });

    assert.doesNotMatch(body, /Questions:/);
  });
});
