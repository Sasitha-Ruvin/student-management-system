"use client";

import { useEffect, useState } from "react";

import { PaymentStructureEditor } from "@/components/payments/payment-structure-editor";
import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { fetchBatchDetail } from "@/lib/api/batches";
import { computeOneTimePrice } from "@/lib/payments/payment-plan-utils";
import type { PaymentStructureValue } from "@/types/api/payment-enrollment";
import { useRegistrationWizardStore } from "@/stores/registration-wizard-store";

export function RegistrationStepPayment() {
  const s = useRegistrationWizardStore();
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [feeTouched, setFeeTouched] = useState(false);

  const paymentValue: PaymentStructureValue = {
    paymentPath: s.paymentPath,
    installmentSource: s.installmentSource,
    paymentPlanId: s.paymentPlanId,
    customInstallments: s.customInstallments,
    customCourseFee: s.customCourseFee,
  };

  useEffect(() => {
    setFeeTouched(false);
  }, [s.batchId]);

  useEffect(() => {
    if (!s.batchId) {
      s.setField("batchPricing", null);
      return;
    }
    void fetchBatchDetail(s.batchId).then((batch) => {
      const courseFee = Number(batch.courseFee);
      const oneTimeDiscountAmount = Number(batch.oneTimeDiscountAmount ?? 0);
      s.setField("batchPricing", {
        courseFee,
        oneTimeDiscountAmount,
        oneTimePrice: Number(
          batch.oneTimePrice ?? computeOneTimePrice(courseFee, oneTimeDiscountAmount),
        ),
      });
    });
  }, [s.batchId]);

  useEffect(() => {
    if (!s.regFeePaid) {
      s.setField("receipt", null);
      setReceiptPreview(null);
    }
  }, [s.regFeePaid]);

  function handlePaymentChange(value: PaymentStructureValue) {
    s.setField("paymentPath", value.paymentPath);
    s.setField("installmentSource", value.installmentSource);
    s.setField("paymentPlanId", value.paymentPlanId);
    s.setField("customInstallments", value.customInstallments);
    s.setField("customCourseFee", value.customCourseFee);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-secondary-300/50 bg-tertiary-100 p-5 shadow-sm">
      <h2 className="font-headline text-xl text-primary-900">Payment</h2>

      {!s.batchId ? (
        <p className="text-sm text-neutral-600">
          Go back and select a batch to configure payment.
        </p>
      ) : (
        <PaymentStructureEditor
          batchId={s.batchId}
          value={paymentValue}
          onChange={handlePaymentChange}
          fieldErrors={{ customCourseFee: s.fieldErrors.customCourseFee }}
          feeTouched={feeTouched}
          onFeeTouched={setFeeTouched}
        />
      )}

      <div className="space-y-4 rounded-xl border border-secondary-300/40 bg-secondary-100/30 p-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={s.regFeePaid}
            onChange={(e) => s.setField("regFeePaid", e.target.checked)}
            className="size-4 rounded border-secondary-400"
          />
          <div>
            <span className="text-sm font-medium text-primary-900">
              Registration fee paid
            </span>
            {!s.regFeePaid && (
              <p className="mt-0.5 text-xs text-neutral-500">
                Leave unchecked if the fee has not been collected yet. This
                only marks intent — record payment from the student profile to
                generate an invoice.
              </p>
            )}
            {s.regFeePaid && (
              <p className="mt-0.5 text-xs text-neutral-500">
                Marks intent only. Record payment from the student profile after
                enroll to generate an invoice.
              </p>
            )}
          </div>
        </label>

        {s.regFeePaid && (
          <FileUploadZone
            previewUrl={receiptPreview}
            onFileSelect={(file, preview) => {
              s.setField("receipt", file);
              setReceiptPreview(preview);
            }}
            title="Upload Receipt"
            description="Attach a photo of the payment receipt. Max 5 MB (JPEG or PNG). Optional."
            previewAlt="Receipt preview"
            previewShape="rectangle"
          />
        )}
      </div>

      {s.submitError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {s.submitError}
          {s.partialStudentId ? (
            <a
              href={`/dashboard/students/${s.partialStudentId}`}
              className="mt-1 block font-medium underline"
            >
              View student profile
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
