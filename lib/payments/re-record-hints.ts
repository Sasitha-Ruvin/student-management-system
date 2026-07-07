import type { RecordPaymentTarget } from "@/components/payments/record-payment-drawer";
import type { RegistrationFeeTarget } from "@/components/payments/record-registration-fee-drawer";
import type { ReRecordHint } from "@/types/api/payment";

export function reRecordToInstallmentTarget(
  hint: Extract<ReRecordHint, { type: "installment" }>,
): RecordPaymentTarget {
  return {
    enrollmentId: hint.enrollmentId,
    studentId: hint.studentId,
    installmentId: hint.installmentId,
    studentName: hint.studentName,
    label: hint.label,
    dueDate: hint.dueDate,
    status: hint.status,
    amount: hint.amount,
    paidAmount: hint.paidAmount,
    overdueCharge: hint.overdueCharge,
    overdueChargeWaived: hint.overdueChargeWaived,
    baseRemaining: hint.baseRemaining,
    feeRemaining: hint.feeRemaining,
    totalRemaining: hint.totalRemaining,
  };
}

export function reRecordToRegistrationTarget(
  hint: Extract<ReRecordHint, { type: "registration" }>,
): RegistrationFeeTarget {
  return {
    studentId: hint.studentId,
    studentName: hint.studentName,
    enrollmentId: hint.enrollmentId,
    batchCode: hint.batchCode,
    registrationFee: hint.registrationFee,
  };
}
