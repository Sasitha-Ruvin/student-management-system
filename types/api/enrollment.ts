export type EnrollmentPaymentPathDto = "INSTALLMENT" | "ONE_TIME";

/** Request body when assigning a student to a batch */
export type AssignEnrollmentBody = {
  studentId?: string;
  batchId?: string;
  paymentPath?: EnrollmentPaymentPathDto;
  customCourseFee?: number | null;
  notes?: string | null;
};
