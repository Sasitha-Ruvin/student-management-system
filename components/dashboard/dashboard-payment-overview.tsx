"use client";

import { formatMoney } from "@/lib/format/money";
import type { DashboardFinance } from "@/types/api/dashboard";

type DashboardPaymentOverviewProps = {
  finance: DashboardFinance;
};

export function DashboardPaymentOverview({
  finance,
}: DashboardPaymentOverviewProps) {
  const { currency } = finance;
  const total = finance.totalCollected + finance.stillOwed;
  const collectedPct =
    total > 0 ? Math.round((finance.totalCollected / total) * 100) : 0;
  const remainingPct = total > 0 ? 100 - collectedPct : 0;

  return (
    <div className="rounded-2xl border border-secondary-300/50 bg-white p-5 shadow-sm">
      <h3 className="font-headline text-lg text-primary-900">
        Collected vs remaining
      </h3>
      <p className="mt-0.5 text-sm text-neutral-600">
        All active student payments
      </p>

      <div className="mt-6">
        <div
          className="flex h-5 overflow-hidden rounded-full bg-secondary-200/80"
          role="progressbar"
          aria-valuenow={collectedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${collectedPct}% collected`}
        >
          {collectedPct > 0 ? (
            <div
              className="bg-primary-900 transition-all"
              style={{ width: `${collectedPct}%` }}
            />
          ) : null}
          {remainingPct > 0 ? (
            <div
              className="bg-secondary-300/90"
              style={{ width: `${remainingPct}%` }}
            />
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary-900" />
            <div>
              <p className="text-sm text-neutral-600">Collected</p>
              <p className="font-headline text-xl text-primary-900">
                {formatMoney(finance.totalCollected, currency, {
                  compact: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-secondary-300" />
            <div>
              <p className="text-sm text-neutral-600">Still to collect</p>
              <p className="font-headline text-xl text-primary-900">
                {formatMoney(finance.stillOwed, currency, { compact: true })}
              </p>
            </div>
          </div>
        </div>

        {total > 0 ? (
          <p className="mt-4 text-center text-sm text-neutral-600">
            <span className="font-medium text-primary-900">
              {collectedPct}%
            </span>{" "}
            of expected fees collected
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-neutral-500">
            No payment data yet
          </p>
        )}
      </div>
    </div>
  );
}
