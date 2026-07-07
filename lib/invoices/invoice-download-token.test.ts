import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInvoiceDownloadToken,
  verifyInvoiceDownloadToken,
} from "@/lib/invoices/invoice-download-token";

describe("invoice download token", () => {
  it("round-trips a valid token", () => {
    process.env.INVOICE_DOWNLOAD_SECRET = "test-invoice-secret";

    const token = createInvoiceDownloadToken("inv_test123", 3600);
    const verified = verifyInvoiceDownloadToken(token);

    assert.ok(verified);
    assert.equal(verified.invoiceId, "inv_test123");
  });

  it("rejects tampered tokens", () => {
    process.env.INVOICE_DOWNLOAD_SECRET = "test-invoice-secret";

    const token = createInvoiceDownloadToken("inv_test123", 3600);
    const tampered = token.replace("inv_test123", "inv_hacked00");
    assert.equal(verifyInvoiceDownloadToken(tampered), null);
  });
});
