"use client";

import { useEffect, useMemo, useState } from "react";

import { ListPagination } from "@/components/ui/list-pagination";

import {
  EditInstallmentModal,
  type EditInstallmentTarget,
} from "@/components/payments/edit-installment-modal";
import { InstallmentGroupedTable } from "@/components/payments/installment-grouped-table";
import { PaymentKpiRow } from "@/components/payments/payment-kpi-row";
import { PaymentPageHeader } from "@/components/payments/payment-page-header";
import { PaymentToolbar } from "@/components/payments/payment-toolbar";
import { InvoiceDownloadButton } from "@/components/payments/invoice-download-button";
import {
  RecordPaymentDrawer,
  type RecordPaymentSuccess,
  type RecordPaymentTarget,
} from "@/components/payments/record-payment-drawer";
import { InlineLoader } from "@/components/ui/loading-state";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useBatchPaymentHistory } from "@/hooks/use-batch-payment-history";
import { useInstallments } from "@/hooks/use-installments";
import { usePaymentFilters } from "@/hooks/use-payment-filters";
import { RecordedPaymentsTable } from "@/components/payments/recorded-payments-table";
import { VoidPaymentModal } from "@/components/payments/void-payment-modal";
import { fetchSettings } from "@/lib/api/settings";
import {
  reRecordToInstallmentTarget,
} from "@/lib/payments/re-record-hints";
import type {
  InstallmentListItem,
  PaymentHistoryItem,
  VoidPaymentResult,
} from "@/types/api/payment";

export function PaymentManagementPage() {
  const filters = usePaymentFilters();
  const { stats, isLoading: statsLoading, reload: reloadStats } =
    useDashboardStats();

  const [overdueChargeAmount, setOverdueChargeAmount] = useState(0);
  const [overdueChargeEnabled, setOverdueChargeEnabled] = useState(false);
  useEffect(() => {
    void fetchSettings().then((d) => {
      setOverdueChargeAmount(d.settings.overdueChargeAmount);
      setOverdueChargeEnabled(d.settings.overdueChargeEnabled);
    });
  }, []);

  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const installmentQuery = useMemo(
    () => ({
      batchId: filters.batchId,
      branchId: filters.branchId,
      status: filters.status,
      search: filters.search,
      page,
      limit: 50,
    }),
    [filters.batchId, filters.branchId, filters.status, filters.search, page],
  );

  const { items, total, totalPages, isLoading, error, reload } =
    useInstallments(installmentQuery);

  const {
    items: historyItems,
    total: historyTotal,
    totalPages: historyTotalPages,
    isLoading: historyLoading,
    reload: reloadHistory,
  } = useBatchPaymentHistory(filters.batchId, historyPage);

  useEffect(() => {
    setPage(1);
    setHistoryPage(1);
  }, [filters.batchId, filters.branchId, filters.status, filters.search]);

  const [recordTarget, setRecordTarget] = useState<RecordPaymentTarget | null>(
    null,
  );
  const [recordSuccess, setRecordSuccess] = useState<RecordPaymentSuccess | null>(
    null,
  );
  const [voidTarget, setVoidTarget] = useState<PaymentHistoryItem | null>(null);
  const [voidMessage, setVoidMessage] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditInstallmentTarget | null>(null);

  function handleEditInstallment(row: InstallmentListItem) {
    setEditTarget({
      installmentId: row.installmentId,
      label: row.label,
      dueDate: row.dueDate,
      amount: row.amount,
      paidAmount: row.paidAmount,
      status: row.status,
      studentName: row.studentName,
    });
  }

  function handleVoidSuccess(result: VoidPaymentResult, message?: string) {
    setVoidMessage(message ?? "Payment voided. You can record the correct payment now.");
    void reload();
    void reloadHistory();
    void reloadStats();
    if (result.reRecord?.type === "installment") {
      setRecordTarget(reRecordToInstallmentTarget(result.reRecord));
    }
  }

  function handleRecordSuccess(info: RecordPaymentSuccess) {
    setRecordSuccess(info);
    void reload();
    void reloadHistory();
    void reloadStats();
  }

  return (
    <div className="flex min-h-0 flex-col gap-6 pb-8">
      <PaymentPageHeader />

      <PaymentKpiRow finance={stats.finance} isLoading={statsLoading} />

      {voidMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{voidMessage}</p>
        </div>
      ) : null}

      {recordSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p>{recordSuccess.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recordSuccess.invoices.map((inv) => (
              <InvoiceDownloadButton
                key={inv.paymentId}
                paymentId={inv.paymentId}
                invoiceNumber={inv.invoiceNumber}
                className="rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-medium text-tertiary-100 hover:bg-primary-800 disabled:opacity-50"
                label={
                  inv.label && recordSuccess.invoices.length > 1
                    ? `${inv.invoiceNumber} (${inv.label})`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <PaymentToolbar
        batchId={filters.batchId}
        setBatchId={filters.setBatchId}
        batches={filters.batches}
        batchesLoading={filters.batchesLoading}
        status={filters.status}
        setStatus={filters.setStatus}
        search={filters.search}
        setSearch={filters.setSearch}
        totalCount={total}
      />

      {!filters.batchId && !filters.batchesLoading ? (
        <p className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 px-5 py-8 text-center text-sm text-neutral-600">
          {filters.batches.length === 0
            ? "No batches found for this branch. Create or open a batch first."
            : "Select a batch to view student instalments."}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : filters.batchId ? (
        <>
          <InstallmentGroupedTable
            items={items}
            isLoading={isLoading}
            showBatch={filters.batchId === "all"}
            onRecordPayment={setRecordTarget}
            onEditInstallment={handleEditInstallment}
            onRefresh={() => void reload()}
            onVoidPayment={setVoidTarget}
          />
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
          {filters.batchId !== "all" ? (
            <RecordedPaymentsTable
              items={historyItems}
              total={historyTotal}
              page={historyPage}
              totalPages={historyTotalPages}
              isLoading={historyLoading}
              onPageChange={setHistoryPage}
              onVoidPayment={setVoidTarget}
            />
          ) : null}
        </>
      ) : (
        <InlineLoader label="Loading batches…" />
      )}

      <RecordPaymentDrawer
        open={recordTarget !== null}
        onClose={() => setRecordTarget(null)}
        target={recordTarget}
        onSuccess={handleRecordSuccess}
        overdueChargeAmount={overdueChargeAmount}
        overdueChargeEnabled={overdueChargeEnabled}
      />

      <VoidPaymentModal
        payment={voidTarget}
        open={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        onSuccess={handleVoidSuccess}
      />

      <EditInstallmentModal
        open={editTarget !== null}
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => void reload()}
      />
    </div>
  );
}
