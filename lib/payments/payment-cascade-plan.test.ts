import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planPaymentCascade } from "@/lib/payments/payment-cascade-plan";

function inst(
  id: string,
  order: number,
  amount: number,
  paid = 0,
  status = "PENDING",
) {
  return {
    installmentId: id,
    label: `Inst ${order}`,
    order,
    status,
    amount,
    paidAmount: paid,
    overdueCharge: 0,
    overdueChargePaid: 0,
    overdueChargeWaived: false,
  };
}

describe("planPaymentCascade", () => {
  it("applies exact amount to a single instalment", () => {
    const { applied, remaining } = planPaymentCascade(
      [inst("a", 0, 10000)],
      "a",
      10000,
    );
    assert.equal(applied.length, 1);
    assert.equal(applied[0]?.amount, 10000);
    assert.equal(remaining, 0);
  });

  it("applies partial payment to one instalment", () => {
    const { applied, remaining } = planPaymentCascade(
      [inst("a", 0, 10000)],
      "a",
      3000,
    );
    assert.equal(applied.length, 1);
    assert.equal(applied[0]?.amount, 3000);
    assert.equal(remaining, 0);
  });

  it("cascades surplus to the next instalment", () => {
    const { applied, remaining } = planPaymentCascade(
      [inst("a", 0, 7000), inst("b", 1, 10000)],
      "a",
      15000,
    );
    assert.equal(applied.length, 2);
    assert.equal(applied[0]?.installmentId, "a");
    assert.equal(applied[0]?.amount, 7000);
    assert.equal(applied[1]?.installmentId, "b");
    assert.equal(applied[1]?.amount, 8000);
    assert.equal(remaining, 0);
  });

  it("rejects amount beyond total remaining across instalments", () => {
    const { applied, remaining } = planPaymentCascade(
      [inst("a", 0, 5000), inst("b", 1, 5000)],
      "a",
      12000,
    );
    assert.equal(applied.length, 2);
    assert.equal(remaining, 2000);
  });

  it("skips PAID instalments when cascading", () => {
    const { applied, remaining } = planPaymentCascade(
      [inst("a", 0, 5000, 5000, "PAID"), inst("b", 1, 3000)],
      "a",
      3000,
    );
    assert.equal(applied.length, 1);
    assert.equal(applied[0]?.installmentId, "b");
    assert.equal(remaining, 0);
  });

  it("waives overdue on first slice only in preview", () => {
    const withFeeList = [
      {
        ...inst("a", 0, 10000),
        overdueCharge: 500,
        overdueChargePaid: 0,
      },
      inst("b", 1, 5000),
    ];
    const waivedList = [
      {
        ...inst("a", 0, 10000),
        overdueCharge: 500,
        overdueChargePaid: 0,
      },
      inst("b", 1, 5000),
    ];
    const withFee = planPaymentCascade(withFeeList, "a", 10500);
    const waived = planPaymentCascade(waivedList, "a", 10000, {
      waiveFirstOverdue: true,
    });
    assert.equal(withFee.applied[0]?.amount, 10500);
    assert.equal(waived.applied[0]?.amount, 10000);
  });
});
