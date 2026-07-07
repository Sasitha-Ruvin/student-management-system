import type { EnrollmentPaymentPath } from "@/types/api/student";

export type EnrollmentInstallmentSource = "BATCH" | "NAMED_PLAN" | "CUSTOM";

export type CustomInstallmentInput = {
  label: string;
  amount: number;
  dueDate: string;
  order: number;
};

export type EnrollmentPaymentOptions = {
  paymentPath: EnrollmentPaymentPath;
  installmentSource?: EnrollmentInstallmentSource;
  paymentPlanId?: string | null;
  customInstallments?: CustomInstallmentInput[];
  customCourseFee?: number | null;
};

/** Controlled state for PaymentStructureEditor */
export type PaymentStructureValue = {
  paymentPath: EnrollmentPaymentPath;
  installmentSource: EnrollmentInstallmentSource;
  paymentPlanId: string | null;
  customInstallments: CustomInstallmentInput[];
  customCourseFee: string;
};

export function initialPaymentStructure(): PaymentStructureValue {
  return {
    paymentPath: "INSTALLMENT",
    installmentSource: "BATCH",
    paymentPlanId: null,
    customInstallments: [emptyCustomInstallment(0)],
    customCourseFee: "",
  };
}

export function emptyCustomInstallment(
  order: number,
  dueDate = "",
): CustomInstallmentInput {
  return {
    label: `Instalment ${order + 1}`,
    amount: 0,
    dueDate,
    order,
  };
}
