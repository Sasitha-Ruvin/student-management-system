"use client";

import { AlertCircle, Banknote, CircleDollarSign, TrendingUp } from "@/lib/icons";
import { formatMoney, formatPercent } from "@/lib/format/money";
import type { DashboardFinance } from "@/types/api/dashboard";

type DashboardFinanceKpiRowProps = {
  finance: DashboardFinance;
};

export function DashboardFinanceKpiRow({ finance }: DashboardFinanceKpiRowProps) {
  const { currency } = finance;

  const items: Array<{
    key: string;
    label: string;
    value: string;
    icon: typeof TrendingUp;
    hint?: string;
  }> = [
    {
      key: "month",
      label: "Received this month",
      value: formatMoney(finance.collectedThisMonth, currency, {
        compact: true,
      }),
      icon: TrendingUp,
    },
    {
      key: "owed",
      label: "Still to collect",
      value: formatMoney(finance.stillOwed, currency, { compact: true }),
      icon: CircleDollarSign,
    },
    {
      key: "progress",
      label: "Payment progress",
      value: formatPercent(finance.collectionRatePercent),
      icon: Banknote,
    },
    {
      key: "overdue",
      label: "Overdue",
      value: String(finance.overdueCount),
      icon: AlertCircle,
      hint:
        finance.overdueCount === 1
          ? "payment"
          : finance.overdueCount > 1
            ? "payments"
            : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ key, label, value, icon: Icon, hint }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-2xl border border-secondary-300/50 bg-white p-4 shadow-sm sm:gap-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-900">
            <Icon className="size-5 text-tertiary-100" />
          </div>
          <div className="min-w-0">
            <p className="font-headline text-xl text-primary-900 sm:text-2xl">
              {value}
              {hint ? (
                <span className="ml-1 text-sm font-sans font-normal text-neutral-600">
                  {hint}
                </span>
              ) : null}
            </p>
            <p className="text-[11px] leading-snug tracking-wide text-neutral-600 uppercase">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
