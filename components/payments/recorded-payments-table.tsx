"use client";

import { InvoiceDownloadButton } from "@/components/payments/invoice-download-button";
import { InlineLoader } from "@/components/ui/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { formatMoney } from "@/lib/format/money";
import type { PaymentHistoryItem } from "@/types/api/payment";

type RecordedPaymentsTableProps = {
  items: PaymentHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onVoidPayment?: (payment: PaymentHistoryItem) => void;
};

export function RecordedPaymentsTable({
  items,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
  onVoidPayment,
}: RecordedPaymentsTableProps) {
  if (isLoading) {
    return <InlineLoader label="Loading recorded payments…" />;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-headline text-lg text-primary-900">
          Recorded payments
        </h2>
        <p className="text-sm text-neutral-600">{total} payment(s)</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 px-5 py-8 text-center text-sm text-neutral-600">
          No payments recorded for this batch yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Instalment</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.paymentId}
                    className="border-b border-secondary-300/30 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {p.invoiceNumber || "—"}
                    </td>
                    <td className="px-4 py-2.5">{p.studentName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {p.installmentLabel ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {formatMoney(p.amount, "LKR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.method.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {p.invoiceNumber ? (
                          <InvoiceDownloadButton
                            paymentId={p.paymentId}
                            invoiceNumber={p.invoiceNumber}
                          />
                        ) : null}
                        {onVoidPayment && !p.voidedAt ? (
                          <button
                            type="button"
                            onClick={() => onVoidPayment(p)}
                            className="rounded-lg border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/5"
                          >
                            Void
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  );
}
