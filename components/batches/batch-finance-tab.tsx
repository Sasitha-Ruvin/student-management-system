"use client";

import { InlineLoader } from "@/components/ui/loading-state";
import { BatchInstallmentScheduleEditor } from "@/components/batches/batch-installment-schedule-editor";
import { formatMoney } from "@/lib/format/money";
import { useBatchFinance } from "@/hooks/use-batch-detail";
import type { BatchDetail } from "@/types/api/batch";

type BatchFinanceTabProps = {
  batchId: string;
  batch: BatchDetail;
  currency?: string;
  onBatchUpdated?: () => void;
};

export function BatchFinanceTab({
  batchId,
  batch,
  currency = "LKR",
  onBatchUpdated,
}: BatchFinanceTabProps) {
  const { finance, isLoading, error, reload } = useBatchFinance(batchId, true);

  const isTerminal = batch.status === "COMPLETED" || batch.status === "CLOSED";
  const canEditSchedule = !isTerminal && batch.installmentTemplates.length > 0;

  if (isLoading) return <InlineLoader label="Loading finance…" />;
  if (error) return <p className="text-destructive">{error}</p>;
  if (!finance) return null;

  function handleSaved() {
    reload();
    onBatchUpdated?.();
  }

  return (
    <div className="space-y-6">
      {canEditSchedule ? (
        <BatchInstallmentScheduleEditor
          batch={batch}
          finance={finance}
          currency={currency}
          onSaved={handleSaved}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <FinanceStat
          label="Total expected"
          value={formatMoney(finance.totalExpected, currency)}
        />
        <FinanceStat
          label="Collected"
          value={formatMoney(finance.totalCollected, currency)}
        />
        <FinanceStat
          label="Outstanding"
          value={formatMoney(finance.outstanding, currency)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
              <th className="px-4 py-3">Installment</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Owed</th>
              <th className="px-4 py-3">Collected</th>
              <th className="px-4 py-3">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {finance.installments.map((row) => (
              <tr
                key={row.templateId}
                className="border-b border-secondary-300/40 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3">
                  {new Date(row.dueDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(row.totalOwed, currency)}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(row.totalCollected, currency)}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(row.outstanding, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-4">
      <p className="text-[11px] uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="font-headline text-2xl text-primary-900">{value}</p>
    </div>
  );
}
