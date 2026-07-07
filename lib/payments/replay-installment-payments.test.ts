import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveInstallmentStatusFromState,
  replayPaymentsOnState,
} from "@/lib/payments/replay-installment-state";

describe("replayPaymentsOnState", () => {
  const base = {
    amount: 10000,
    paidAmount: 0,
    overdueCharge: 0,
    overdueChargePaid: 0,
    overdueChargeWaived: true,
  };

  it("returns PENDING when no payments applied", () => {
    const { state, status } = replayPaymentsOnState(
      base,
      [],
      "PENDING",
      new Date("2030-01-01"),
    );
    assert.equal(state.paidAmount, 0);
    assert.equal(status, "PENDING");
  });

  it("marks PAID after full payment", () => {
    const { state, status } = replayPaymentsOnState(
      base,
      [10000],
      "PENDING",
      new Date("2030-01-01"),
    );
    assert.equal(state.paidAmount, 10000);
    assert.equal(status, "PAID");
  });

  it("restores first partial when second payment is removed from replay", () => {
    const afterBoth = replayPaymentsOnState(base, [3000, 2000]);
    assert.equal(afterBoth.state.paidAmount, 5000);
    assert.equal(afterBoth.status, "PARTIAL");

    const afterVoidSecond = replayPaymentsOnState(base, [3000]);
    assert.equal(afterVoidSecond.state.paidAmount, 3000);
    assert.equal(afterVoidSecond.status, "PARTIAL");
  });

  it("applies base before overdue fee", () => {
    const withFee = {
      ...base,
      overdueCharge: 500,
      overdueChargeWaived: false,
    };
    const { state } = replayPaymentsOnState(withFee, [10500]);
    assert.equal(state.paidAmount, 10000);
    assert.equal(state.overdueChargePaid, 500);
  });
});

describe("deriveInstallmentStatusFromState", () => {
  it("keeps CANCELLED unchanged", () => {
    const status = deriveInstallmentStatusFromState(
      {
        amount: 1000,
        paidAmount: 0,
        overdueCharge: 0,
        overdueChargePaid: 0,
        overdueChargeWaived: true,
      },
      new Date("2020-01-01"),
      "CANCELLED",
    );
    assert.equal(status, "CANCELLED");
  });
});
