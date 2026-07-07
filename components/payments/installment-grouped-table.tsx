"use client";

import { Fragment, useState } from "react";

import { InstallmentRowActions } from "@/components/payments/installment-row-actions";
import { InstallmentStatusBadge } from "@/components/payments/installment-status-badge";
import type { RecordPaymentTarget } from "@/components/payments/record-payment-drawer";
import { InlineLoader } from "@/components/ui/loading-state";
import { ChevronDown, ChevronRight } from "@/lib/icons";
import { formatMoney } from "@/lib/format/money";
import { groupInstallmentsByStudent } from "@/lib/payments/group-installments-by-student";
import type {
  InstallmentListItem,
  PaymentHistoryItem,
} from "@/types/api/payment";

type InstallmentGroupedTableProps = {
  items: InstallmentListItem[];
  isLoading: boolean;
  showBatch?: boolean;
  onRecordPayment: (target: RecordPaymentTarget) => void;
  onEditInstallment?: (row: InstallmentListItem) => void;
  onRefresh?: () => void;
  onVoidPayment?: (payment: PaymentHistoryItem) => void;
};

export function InstallmentGroupedTable({
  items,
  isLoading,
  showBatch = false,
  onRecordPayment,
  onEditInstallment,
  onRefresh,
  onVoidPayment,
}: InstallmentGroupedTableProps) {
  const groups = groupInstallmentsByStudent(items);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <InlineLoader label="Loading instalments…" />;
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 px-5 py-8 text-center text-sm text-neutral-600">
        No instalments match your filters.
      </p>
    );
  }

  function toggleStudent(studentId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
            <th className="px-4 py-3">Student / Instalment</th>
            <th className="px-4 py-3">Due</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Paid</th>
            <th className="px-4 py-3">Overdue fee</th>
            <th className="px-4 py-3">Total due</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.studentId);
            return (
              <Fragment key={group.studentId}>
                <tr
                  className="border-b border-secondary-300/40 bg-secondary-100/50"
                >
                  <td colSpan={8} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleStudent(group.studentId)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-4 shrink-0 text-neutral-600" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-neutral-600" />
                      )}
                      <span className="font-medium text-primary-900">
                        {group.studentName}
                      </span>
                      <span className="font-mono text-xs text-neutral-600">
                        {group.modelCode}
                      </span>
                    </button>
                  </td>
                </tr>
                {!isCollapsed
                  ? group.installments.map((row) => (
                      <InstallmentRow
                        key={row.installmentId}
                        row={row}
                        showBatch={showBatch}
                        onRecordPayment={onRecordPayment}
                        onEditInstallment={onEditInstallment}
                        onRefresh={onRefresh}
                        onVoidPayment={onVoidPayment}
                      />
                    ))
                  : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InstallmentRow({
  row,
  showBatch,
  onRecordPayment,
  onEditInstallment,
  onRefresh,
  onVoidPayment,
}: {
  row: InstallmentListItem;
  showBatch?: boolean;
  onRecordPayment: (target: RecordPaymentTarget) => void;
  onEditInstallment?: (row: InstallmentListItem) => void;
  onRefresh?: () => void;
  onVoidPayment?: (payment: PaymentHistoryItem) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const payments = row.payments ?? [];
  const hasHistory = payments.length > 0;

  return (
    <>
      <tr className="border-b border-secondary-300/30 last:border-0">
        <td className="px-4 py-2.5 pl-10 text-neutral-800">
          <div className="flex items-center gap-2">
            {hasHistory ? (
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="text-neutral-500 hover:text-primary-900"
                aria-expanded={historyOpen}
                aria-label={historyOpen ? "Hide payments" : "Show payments"}
              >
                {historyOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <span className="inline-block w-4" />
            )}
            <span>{row.label}</span>
            {showBatch && row.batchCode ? (
              <span className="rounded-full bg-secondary-200/80 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                {row.batchCode}
              </span>
            ) : null}
            {payments.length > 1 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                {payments.length} payments
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-2.5">
          {new Date(row.dueDate).toLocaleDateString()}
        </td>
        <td className="px-4 py-2.5">{formatMoney(row.amount, "LKR")}</td>
        <td className="px-4 py-2.5">{formatMoney(row.paidAmount, "LKR")}</td>
        <td className="px-4 py-2.5">
          {row.feeRemaining > 0 ? (
            <span className="text-red-800">
              {formatMoney(row.feeRemaining, "LKR")}
            </span>
          ) : (
            <span className="text-neutral-500">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 font-medium">
          {formatMoney(row.totalRemaining, "LKR")}
        </td>
        <td className="px-4 py-2.5">
          <InstallmentStatusBadge status={row.status} />
        </td>
        <td className="px-4 py-2.5 text-right">
          <InstallmentRowActions
            row={row}
            onRecordPayment={onRecordPayment}
            onEdit={onEditInstallment}
            onWaived={onRefresh}
          />
        </td>
      </tr>
      {historyOpen && hasHistory ? (
        <tr className="border-b border-secondary-300/30 bg-secondary-100/30">
          <td colSpan={8} className="px-4 py-3 pl-14">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-neutral-600 uppercase">
              Payment history
            </p>
            <ul className="space-y-1.5 text-sm">
              {payments.map((p) => (
                <li
                  key={p.paymentId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-neutral-700">
                    {new Date(p.paymentDate).toLocaleDateString()} ·{" "}
                    {formatMoney(p.amount, "LKR")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-500">
                      {p.invoiceNumber}
                    </span>
                    {onVoidPayment ? (
                      <button
                        type="button"
                        onClick={() =>
                          onVoidPayment({
                            paymentId: p.paymentId,
                            invoiceNumber: p.invoiceNumber,
                            installmentLabel: row.label,
                            amount: p.amount,
                            paymentDate: p.paymentDate,
                            method: "CASH",
                            reference: null,
                            notes: null,
                            recordedByName: "",
                            pdfUrl: null,
                            createdAt: p.paymentDate,
                          })
                        }
                        className="rounded border border-destructive/40 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                      >
                        Void
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}
