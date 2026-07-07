import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeInvoiceContentHash } from "@/lib/pdf/invoice-content-hash";
import type { InvoiceData } from "@/lib/pdf/generate-invoice";

const base: InvoiceData = {
  invoiceNumber: "INV-2026-0001",
  paymentDate: "2026-05-20T10:00:00.000Z",
  paymentType: "INSTALLMENT",
  method: "CASH",
  reference: null,
  notes: null,
  recordedByName: "Admin",
  amount: 5000,
  paidThisReceipt: 5000,
  studentName: "Test Student",
  studentEmail: "test@example.com",
  studentPhone: "0771234567",
  studentAddress: "Colombo",
  installmentLabel: "Instalment 1",
  batchCode: "COL-2026",
  lineDescription: "INSTALMENT 1",
  lines: [{ description: "INSTALMENT 1", amount: 5000 }],
  academyName: "The Walk Model Academy",
  academyAddress: null,
  academyPhone: null,
  academyEmail: null,
  academyLogoUrl: null,
  currency: "LKR",
  invoiceFooter: "THANK YOU!",
  invoiceTerms: null,
  paymentMethodLabel: null,
  bankName: null,
  bankAccountNumber: null,
  bankAccountName: null,
  bankBranch: null,
};

describe("computeInvoiceContentHash", () => {
  it("is stable for the same payload", () => {
    const a = computeInvoiceContentHash(base);
    const b = computeInvoiceContentHash({ ...base });
    assert.equal(a, b);
  });

  it("changes when line items change", () => {
    const a = computeInvoiceContentHash(base);
    const b = computeInvoiceContentHash({
      ...base,
      lines: [{ description: "INSTALMENT 1", amount: 4000 }],
    });
    assert.notEqual(a, b);
  });
});
