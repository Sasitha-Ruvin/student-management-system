import type { PaymentStructureValue } from "@/types/api/payment-enrollment";
import type { AssignBatchBody } from "@/types/api/student";

import type { CreateEnrollmentInstallmentsInput } from "./create-enrollment-installments";

export function buildEnrollmentPaymentData(body: AssignBatchBody) {
  const installmentSource =
    body.installmentSource ??
    (body.customInstallments && body.customInstallments.length > 0
      ? "CUSTOM"
      : body.paymentPlanId
        ? "NAMED_PLAN"
        : "BATCH");

  return {
    paymentPath: body.paymentPath,
    installmentSource,
    paymentPlanId:
      installmentSource === "NAMED_PLAN" ? (body.paymentPlanId ?? null) : null,
  };
}

export function paymentStructureToAssignBody(
  batchId: string,
  value: PaymentStructureValue,
  extra?: Pick<AssignBatchBody, "regFeePaid" | "notes">,
): AssignBatchBody {
  const customCourseFee =
    value.customCourseFee.trim() !== ""
      ? Number(value.customCourseFee)
      : undefined;

  const body: AssignBatchBody = {
    batchId,
    paymentPath: value.paymentPath,
    customCourseFee,
    ...extra,
  };

  if (value.paymentPath === "INSTALLMENT") {
    body.installmentSource = value.installmentSource;
    if (value.installmentSource === "NAMED_PLAN") {
      body.paymentPlanId = value.paymentPlanId;
    } else if (value.installmentSource === "CUSTOM") {
      body.customInstallments = value.customInstallments;
    }
  }

  return body;
}

export function validatePaymentStructure(
  value: PaymentStructureValue,
): string | null {
  if (value.paymentPath !== "INSTALLMENT") return null;

  if (value.installmentSource === "NAMED_PLAN" && !value.paymentPlanId) {
    return "Select a payment plan";
  }

  if (value.installmentSource === "CUSTOM") {
    if (value.customInstallments.length === 0) {
      return "Add at least one custom instalment";
    }
    const missingDue = value.customInstallments.some((l) => !l.dueDate.trim());
    if (missingDue) return "Due dates are required for all custom instalments";
  }

  const fee = Number(value.customCourseFee);
  if (value.customCourseFee !== "" && (Number.isNaN(fee) || fee < 0)) {
    return "Course fee must be zero or positive";
  }

  return null;
}

export function buildCreateInstallmentsInput(
  enrollmentId: string,
  body: AssignBatchBody,
  customCourseFee?: number,
): CreateEnrollmentInstallmentsInput {
  const data = buildEnrollmentPaymentData(body);
  return {
    enrollmentId,
    batchId: body.batchId,
    paymentPath: body.paymentPath,
    installmentSource: data.installmentSource,
    paymentPlanId: body.paymentPlanId,
    customInstallments: body.customInstallments,
    customCourseFee,
  };
}
