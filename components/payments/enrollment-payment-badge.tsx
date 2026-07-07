import type { StudentEnrollmentRow } from "@/types/api/student";

const SOURCE_LABELS: Record<
  NonNullable<StudentEnrollmentRow["installmentSource"]>,
  string
> = {
  BATCH: "Batch plan",
  NAMED_PLAN: "Named plan",
  CUSTOM: "Custom schedule",
};

type EnrollmentPaymentBadgeProps = {
  installmentSource: StudentEnrollmentRow["installmentSource"];
  paymentPlanName: string | null;
  paymentPath: StudentEnrollmentRow["paymentPath"];
};

export function EnrollmentPaymentBadge({
  installmentSource,
  paymentPlanName,
  paymentPath,
}: EnrollmentPaymentBadgeProps) {
  if (paymentPath === "ONE_TIME") {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary-200/80 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
        One-time
      </span>
    );
  }

  if (!installmentSource || installmentSource === "BATCH") {
    return null;
  }

  const label =
    installmentSource === "NAMED_PLAN" && paymentPlanName
      ? paymentPlanName
      : SOURCE_LABELS[installmentSource];

  return (
    <span className="inline-flex items-center rounded-full bg-primary-900/10 px-2 py-0.5 text-[10px] font-medium text-primary-900">
      {label}
    </span>
  );
}
