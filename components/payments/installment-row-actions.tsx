"use client";

import { useState } from "react";

import { InvoiceDownloadButton } from "@/components/payments/invoice-download-button";
import type { RecordPaymentTarget } from "@/components/payments/record-payment-drawer";
import { waiveInstallmentOverdueCharge } from "@/lib/api/payments";
import { formatMoney } from "@/lib/format/money";
import type { InstallmentListItem } from "@/types/api/payment";

type InstallmentRowActionsProps = {
  row: InstallmentListItem;
  onRecordPayment: (target: RecordPaymentTarget) => void;
  onEdit?: (row: InstallmentListItem) => void;
  onWaived?: () => void;
};

export function InstallmentRowActions({
  row,
  onRecordPayment,
  onEdit,
  onWaived,
}: InstallmentRowActionsProps) {
  const [waiving, setWaiving] = useState(false);
  const canRecord = row.status !== "PAID" && row.totalRemaining > 0;
  const canEdit = row.status !== "CANCELLED" && Boolean(onEdit);
  const canWaive =
    row.overdueCharge > 0 && row.feeRemaining > 0 && !row.overdueChargeWaived;
  const payments = row.payments ?? [];

  async function handleWaive() {
    if (
      !confirm(
        `Waive the overdue charge (${formatMoney(row.feeRemaining, "LKR")}) for ${row.label}?`,
      )
    ) {
      return;
    }
    setWaiving(true);
    try {
      await waiveInstallmentOverdueCharge(row.installmentId, true);
      onWaived?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to waive charge");
    } finally {
      setWaiving(false);
    }
  }

  if (!canRecord && !canEdit && payments.length === 0 && !canWaive) {
    return <span className="text-xs text-neutral-500">—</span>;
  }

  return (
    <div className="inline-flex flex-col items-end gap-2">
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit?.(row)}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-neutral-700"
          >
            Edit
          </button>
        ) : null}
        {canRecord ? (
          <button
            type="button"
            onClick={() =>
              onRecordPayment({
                enrollmentId: row.enrollmentId,
                studentId: row.studentId,
                installmentId: row.installmentId,
                studentName: row.studentName,
                label: row.label,
                dueDate: row.dueDate,
                status: row.status,
                amount: row.amount,
                paidAmount: row.paidAmount,
                overdueCharge: row.overdueCharge,
                overdueChargeWaived: row.overdueChargeWaived,
                baseRemaining: row.baseRemaining,
                feeRemaining: row.feeRemaining,
                totalRemaining: row.totalRemaining,
              })
            }
            className="rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-medium text-tertiary-100"
          >
            Record payment
          </button>
        ) : null}
        {canWaive ? (
          <button
            type="button"
            disabled={waiving}
            onClick={() => void handleWaive()}
            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-neutral-700"
          >
            {waiving ? "Waiving…" : "Waive fee"}
          </button>
        ) : null}
      </div>
      {payments.length > 0 ? (
        <div className="flex flex-col items-end gap-1">
          {payments.map((p) => (
            <InvoiceDownloadButton
              key={p.paymentId}
              paymentId={p.paymentId}
              invoiceNumber={p.invoiceNumber}
              label={`Receipt · ${formatMoney(p.amount, "LKR")}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
