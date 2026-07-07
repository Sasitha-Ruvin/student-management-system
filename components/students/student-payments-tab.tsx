"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EditInstallmentModal,
  type EditInstallmentTarget,
} from "@/components/payments/edit-installment-modal";
import { InvoiceDownloadButton } from "@/components/payments/invoice-download-button";
import { InstallmentRowActions } from "@/components/payments/installment-row-actions";
import { InstallmentStatusBadge } from "@/components/payments/installment-status-badge";
import {
  RecordRegistrationFeeDrawer,
  type RecordRegistrationFeeSuccess,
  type RegistrationFeeTarget,
} from "@/components/payments/record-registration-fee-drawer";
import {
  RecordPaymentDrawer,
  type RecordPaymentSuccess,
  type RecordPaymentTarget,
} from "@/components/payments/record-payment-drawer";
import { InlineLoader } from "@/components/ui/loading-state";
import { VoidPaymentModal } from "@/components/payments/void-payment-modal";
import {
  fetchRegistrationPayment,
  fetchStudentInstallments,
  fetchStudentPayments,
} from "@/lib/api/payments";
import { fetchSettings } from "@/lib/api/settings";
import { formatMoney } from "@/lib/format/money";
import {
  reRecordToInstallmentTarget,
  reRecordToRegistrationTarget,
} from "@/lib/payments/re-record-hints";
import type {
  InstallmentListItem,
  PaymentHistoryItem,
  VoidPaymentResult,
} from "@/types/api/payment";
import type { StudentEnrollmentRow } from "@/types/api/student";

type StudentPaymentsTabProps = {
  studentId: string;
  studentName: string;
  enrollments: StudentEnrollmentRow[];
  onRegistrationFeeRecorded?: () => void;
};

export function StudentPaymentsTab({
  studentId,
  studentName,
  enrollments,
  onRegistrationFeeRecorded,
}: StudentPaymentsTabProps) {
  const [installments, setInstallments] = useState<InstallmentListItem[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overdueChargeAmount, setOverdueChargeAmount] = useState(0);
  const [overdueChargeEnabled, setOverdueChargeEnabled] = useState(false);
  const [recordTarget, setRecordTarget] = useState<RecordPaymentTarget | null>(
    null,
  );
  const [recordSuccess, setRecordSuccess] = useState<RecordPaymentSuccess | null>(
    null,
  );
  const [regFeeTarget, setRegFeeTarget] = useState<RegistrationFeeTarget | null>(
    null,
  );
  const [regFeeSuccess, setRegFeeSuccess] =
    useState<RecordRegistrationFeeSuccess | null>(null);
  const [voidTarget, setVoidTarget] = useState<PaymentHistoryItem | null>(null);
  const [voidMessage, setVoidMessage] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditInstallmentTarget | null>(null);
  const [regPayments, setRegPayments] = useState<
    Record<string, { paymentId: string; invoiceNumber: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [instData, payData] = await Promise.all([
        fetchStudentInstallments(studentId),
        fetchStudentPayments(studentId),
      ]);
      setInstallments(instData.items);
      setHistory(payData.items);
      setTotalPaid(payData.totalPaid);

      const paidEnrollments = enrollments.filter(
        (e) => e.regFeePaid && e.registrationFee != null,
      );
      const regEntries = await Promise.all(
        paidEnrollments.map(async (e) => {
          try {
            const p = await fetchRegistrationPayment(studentId, e.enrollmentId);
            return p
              ? ([
                  e.enrollmentId,
                  {
                    paymentId: p.paymentId,
                    invoiceNumber: p.invoiceNumber,
                  },
                ] as const)
              : null;
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, { paymentId: string; invoiceNumber: string }> =
        {};
      for (const entry of regEntries) {
        if (entry) map[entry[0]] = entry[1];
      }
      setRegPayments(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [studentId, enrollments]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchSettings().then((d) => {
      setOverdueChargeAmount(d.settings.overdueChargeAmount);
      setOverdueChargeEnabled(d.settings.overdueChargeEnabled);
    });
  }, []);

  if (loading) {
    return <InlineLoader label="Loading payments…" />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  function handleVoidSuccess(result: VoidPaymentResult, message?: string) {
    setVoidMessage(message ?? "Payment voided. You can record the correct payment now.");
    void load();
    onRegistrationFeeRecorded?.();
    if (result.reRecord?.type === "installment") {
      setRecordTarget(reRecordToInstallmentTarget(result.reRecord));
    } else if (result.reRecord?.type === "registration") {
      setRegFeeTarget(reRecordToRegistrationTarget(result.reRecord));
    }
  }

  return (
    <div className="space-y-6">
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

      {voidMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{voidMessage}</p>
        </div>
      ) : null}

      {regFeeSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p>{regFeeSuccess.message}</p>
          <div className="mt-2">
            <InvoiceDownloadButton
              paymentId={regFeeSuccess.paymentId}
              invoiceNumber={regFeeSuccess.invoiceNumber}
              className="rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-medium text-tertiary-100 hover:bg-primary-800 disabled:opacity-50"
            />
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
        <h2 className="mb-4 font-headline text-lg text-primary-900">
          Registration fees
        </h2>
        <p className="mb-4 text-xs text-neutral-600">
          Checking &quot;Registration fee paid&quot; during enroll only marks
          intent. Record payment here to create an invoice.
        </p>
        {enrollments.length === 0 ? (
          <p className="text-sm text-neutral-600">No enrollments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Fee</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const regPayment = regPayments[e.enrollmentId];
                  const canRecord =
                    !e.regFeePaid &&
                    e.registrationFee != null &&
                    e.registrationFee > 0 &&
                    e.batchId != null;

                  return (
                    <tr
                      key={e.enrollmentId}
                      className="border-b border-secondary-300/40 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-primary-900">
                        {e.batchCode ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {e.registrationFee != null
                          ? formatMoney(e.registrationFee, "LKR")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {e.regFeePaid ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {e.regFeePaid && regPayment ? (
                          <InvoiceDownloadButton
                            paymentId={regPayment.paymentId}
                            invoiceNumber={regPayment.invoiceNumber}
                            label="Invoice"
                            className="rounded-lg border border-secondary-400 px-3 py-1.5 text-xs font-medium text-primary-900 hover:bg-secondary-100/60"
                          />
                        ) : canRecord ? (
                          <button
                            type="button"
                            onClick={() =>
                              setRegFeeTarget({
                                studentId,
                                studentName,
                                enrollmentId: e.enrollmentId,
                                batchCode: e.batchCode,
                                registrationFee: e.registrationFee!,
                              })
                            }
                            className="rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-medium text-tertiary-100"
                          >
                            Record payment
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
        <h2 className="mb-4 font-headline text-lg text-primary-900">
          Instalments
        </h2>
        {installments.length === 0 ? (
          <p className="text-sm text-neutral-600">No instalments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Overdue fee</th>
                  <th className="px-3 py-2">Total due</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((row) => (
                  <tr
                    key={row.installmentId}
                    className="border-b border-secondary-300/40 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2">
                      {new Date(row.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      {formatMoney(row.amount, "LKR")}
                    </td>
                    <td className="px-3 py-2">
                      {formatMoney(row.paidAmount, "LKR")}
                    </td>
                    <td className="px-3 py-2">
                      {row.feeRemaining > 0 ? (
                        <span className="text-red-800">
                          {formatMoney(row.feeRemaining, "LKR")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatMoney(row.totalRemaining, "LKR")}
                    </td>
                    <td className="px-3 py-2">
                      <InstallmentStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <InstallmentRowActions
                        row={{ ...row, studentName }}
                        onRecordPayment={setRecordTarget}
                        onEdit={(r) =>
                          setEditTarget({
                            installmentId: r.installmentId,
                            label: r.label,
                            dueDate: r.dueDate,
                            amount: r.amount,
                            paidAmount: r.paidAmount,
                            status: r.status,
                            studentName,
                          })
                        }
                        onWaived={() => void load()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-headline text-lg text-primary-900">
            Payment history
          </h2>
          <p className="text-sm text-neutral-600">
            Total paid:{" "}
            <span className="font-medium text-primary-900">
              {formatMoney(totalPaid, "LKR")}
            </span>
          </p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-neutral-600">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-300/60 text-[11px] uppercase text-neutral-600">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Instalment</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr
                    key={p.paymentId}
                    className={[
                      "border-b border-secondary-300/40 last:border-0",
                      p.voidedAt ? "bg-neutral-100/80 text-neutral-500" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {p.invoiceNumber || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {p.installmentLabel ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatMoney(p.amount, "LKR")}
                    </td>
                    <td className="px-3 py-2">
                      {p.method.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {p.voidedAt ? (
                          <span className="text-xs font-medium text-neutral-500">
                            Voided
                          </span>
                        ) : null}
                        {p.invoiceNumber && !p.voidedAt ? (
                          <InvoiceDownloadButton
                            paymentId={p.paymentId}
                            invoiceNumber={p.invoiceNumber}
                          />
                        ) : null}
                        {!p.voidedAt ? (
                          <button
                            type="button"
                            onClick={() => setVoidTarget(p)}
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
        )}
      </section>

      <RecordPaymentDrawer
        open={recordTarget !== null}
        onClose={() => setRecordTarget(null)}
        target={recordTarget}
        onSuccess={(info) => {
          setRecordSuccess(info);
          void load();
        }}
        overdueChargeAmount={overdueChargeAmount}
        overdueChargeEnabled={overdueChargeEnabled}
      />

      <RecordRegistrationFeeDrawer
        open={regFeeTarget !== null}
        onClose={() => setRegFeeTarget(null)}
        target={regFeeTarget}
        onSuccess={(info) => {
          setRegFeeSuccess(info);
          onRegistrationFeeRecorded?.();
          void load();
        }}
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
        onSuccess={() => void load()}
      />
    </div>
  );
}
