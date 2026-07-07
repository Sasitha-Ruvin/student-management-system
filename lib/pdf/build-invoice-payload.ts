import {
  inferPaymentAllocation,
  type InstallmentBalanceInput,
} from "@/lib/payments/installment-balance";
import {
  isRegistrationFeePayment,
  parseRegFeeEnrollmentId,
  registrationFeeDisplayLabel,
} from "@/lib/payments/registration-fee";
import {
  decryptPaymentSensitive,
  PAYMENT_SENSITIVE_SELECT,
} from "@/lib/payments/payment-sensitive";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";

import type {
  InvoiceData,
  InvoiceLineItem,
  InvoicePaymentType,
} from "./generate-invoice";

function resolvePaymentType(
  paymentPath: string | null | undefined,
  installmentLabel: string | null,
): InvoicePaymentType {
  if (paymentPath === "ONE_TIME") return "ONE_TIME";
  if (paymentPath === "INSTALLMENT") return "INSTALLMENT";
  if (installmentLabel?.toLowerCase().includes("one-time")) {
    return "ONE_TIME";
  }
  return "INSTALLMENT";
}

function buildLineDescription(
  paymentType: InvoicePaymentType,
  installmentLabel: string | null,
): string {
  if (installmentLabel?.trim()) {
    return installmentLabel.trim().toUpperCase();
  }
  if (paymentType === "ONE_TIME") {
    return "MODEL REGISTRATION";
  }
  return "INSTALMENT PAYMENT";
}

function buildInvoiceLines(
  paymentType: InvoicePaymentType,
  installmentLabel: string | null,
  toBase: number,
  toFee: number,
  waived: boolean,
): InvoiceLineItem[] {
  const lines: InvoiceLineItem[] = [];
  const instalmentDesc = buildLineDescription(paymentType, installmentLabel);

  if (toBase > 0.001) {
    lines.push({ description: instalmentDesc, amount: toBase });
  }
  if (toFee > 0.001 && !waived) {
    lines.push({ description: "OVERDUE CHARGE", amount: toFee });
  }

  if (lines.length === 0) {
    lines.push({ description: instalmentDesc, amount: toBase + toFee });
  }

  return lines;
}

/**
 * Loads payment, student, installment, academy settings for invoice PDF.
 */
export async function buildInvoicePayload(
  paymentId: string,
): Promise<InvoiceData | null> {
  const [payment, settings] = await Promise.all([
    prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        method: true,
        installmentId: true,
        ...PAYMENT_SENSITIVE_SELECT,
        installment: {
          select: {
            label: true,
            amount: true,
            paidAmount: true,
            overdueCharge: true,
            overdueChargePaid: true,
            overdueChargeWaived: true,
            enrollment: {
              select: {
                paymentPath: true,
                batch: { select: { batchCode: true } },
              },
            },
          },
        },
        invoice: { select: { invoiceNumber: true } },
        recordedBy: { select: { name: true } },
        student: { select: STUDENT_PII_SELECT },
      },
    }),
    prisma.academySettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!payment?.invoice) return null;

  const sensitive = decryptPaymentSensitive(payment);
  const studentPii = decryptStudentPii(payment.student);
  const paidThisReceipt = Number(payment.amount);
  const paymentPath = payment.installment?.enrollment.paymentPath ?? null;
  const installmentLabel = payment.installment?.label ?? null;
  const paymentType = resolvePaymentType(paymentPath, installmentLabel);
  const lineDescription = buildLineDescription(paymentType, installmentLabel);

  let lines: InvoiceLineItem[];
  let batchCode: string | null =
    payment.installment?.enrollment.batch?.batchCode ?? null;

  if (payment.installment) {
    const afterState: InstallmentBalanceInput = {
      amount: Number(payment.installment.amount),
      paidAmount: Number(payment.installment.paidAmount),
      overdueCharge: Number(payment.installment.overdueCharge),
      overdueChargePaid: Number(payment.installment.overdueChargePaid),
      overdueChargeWaived: payment.installment.overdueChargeWaived,
    };
    const { toBase, toFee } = inferPaymentAllocation(afterState, paidThisReceipt);
    lines = buildInvoiceLines(
      paymentType,
      installmentLabel,
      toBase,
      toFee,
      afterState.overdueChargeWaived,
    );
  } else if (isRegistrationFeePayment(payment)) {
    const enrollmentId = parseRegFeeEnrollmentId(payment);
    if (enrollmentId) {
      const enr = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { batch: { select: { batchCode: true } } },
      });
      batchCode = enr?.batch?.batchCode ?? null;
    }
    const regDesc = registrationFeeDisplayLabel(payment, batchCode).toUpperCase();
    lines = [{ description: regDesc, amount: paidThisReceipt }];
  } else {
    lines = [{ description: lineDescription, amount: paidThisReceipt }];
  }

  const resolvedLineDescription =
    lines[0]?.description ?? lineDescription;

  return {
    invoiceNumber: payment.invoice.invoiceNumber,
    paymentDate: payment.paymentDate.toISOString(),
    paymentType,
    method: payment.method,
    reference: sensitive.reference,
    notes: sensitive.notes,
    recordedByName: payment.recordedBy.name,
    amount: paidThisReceipt,
    paidThisReceipt,
    studentName: payment.student.fullName,
    studentEmail: payment.student.email,
    studentPhone: studentPii.contactNumber,
    studentAddress: studentPii.address,
    installmentLabel,
    batchCode,
    lineDescription: resolvedLineDescription,
    lines,
    academyName: settings?.academyName ?? "The Walk Model Academy",
    academyAddress: settings?.address ?? null,
    academyPhone: settings?.contactPhone ?? null,
    academyEmail: settings?.contactEmail ?? null,
    academyLogoUrl: settings?.logoUrl ?? null,
    currency: settings?.currency ?? "LKR",
    invoiceFooter: settings?.invoiceFooter ?? "THANK YOU!",
    invoiceTerms: settings?.invoiceTerms ?? null,
    paymentMethodLabel: settings?.invoicePaymentMethodLabel ?? null,
    bankName: settings?.invoiceBankName ?? null,
    bankAccountNumber: settings?.invoiceBankAccountNumber ?? null,
    bankAccountName: settings?.invoiceBankAccountName ?? null,
    bankBranch: settings?.invoiceBankBranch ?? null,
  };
}
