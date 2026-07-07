import { prisma } from "@/lib/prisma";
import { replayInstallmentBalances } from "@/lib/payments/replay-installment-payments";
import {
  encryptPaymentSensitiveForWrite,
  PAYMENT_SENSITIVE_SELECT,
} from "@/lib/payments/payment-sensitive";
import {
  isRegistrationFeePayment,
  parseRegFeeEnrollmentId,
} from "@/lib/payments/registration-fee";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import type { InstallmentStatus } from "@/types/api/payment";

export class VoidPaymentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "VoidPaymentError";
  }
}

export type ReRecordHint =
  | {
      type: "installment";
      installmentId: string;
      enrollmentId: string;
      studentId: string;
      studentName: string;
      label: string;
      dueDate: string;
      amount: number;
      paidAmount: number;
      overdueCharge: number;
      overdueChargeWaived: boolean;
      baseRemaining: number;
      feeRemaining: number;
      totalRemaining: number;
      status: InstallmentStatus;
    }
  | {
      type: "registration";
      enrollmentId: string;
      studentId: string;
      studentName: string;
      batchCode: string | null;
      registrationFee: number;
    };

export type VoidPaymentResult = {
  paymentId: string;
  voidedAt: string;
  studentId: string;
  installmentId: string | null;
  installmentLabel: string | null;
  reRecord: ReRecordHint | null;
};

export async function voidPayment(
  paymentId: string,
  voidedById: string,
  reason: string,
): Promise<VoidPaymentResult> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw new VoidPaymentError("Void reason must be at least 3 characters", 400);
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        studentId: true,
        installmentId: true,
        ...PAYMENT_SENSITIVE_SELECT,
        voidedAt: true,
        amount: true,
        student: { select: { ...STUDENT_PII_SELECT } },
        installment: {
          select: {
            id: true,
            label: true,
            enrollmentId: true,
            dueDate: true,
            amount: true,
            overdueCharge: true,
            overdueChargeWaived: true,
            enrollment: {
              select: {
                batch: {
                  select: {
                    batchCode: true,
                    registrationFee: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new VoidPaymentError("Payment not found", 404);
    }

    if (payment.voidedAt) {
      throw new VoidPaymentError("Payment is already voided", 409);
    }

    const voidedAt = new Date();

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        voidedAt,
        voidedById,
        ...encryptPaymentSensitiveForWrite({ voidReason: trimmedReason }),
      },
    });

    let reRecord: ReRecordHint | null = null;

    if (payment.installmentId) {
      const replay = await replayInstallmentBalances(payment.installmentId, tx);
      const inst = payment.installment!;

      reRecord = {
        type: "installment",
        installmentId: payment.installmentId,
        enrollmentId: inst.enrollmentId,
        studentId: payment.studentId,
        studentName: payment.student.fullName,
        label: inst.label,
        dueDate: inst.dueDate.toISOString(),
        amount: Number(inst.amount),
        paidAmount: replay.paidAmount,
        overdueCharge: Number(inst.overdueCharge),
        overdueChargeWaived: inst.overdueChargeWaived,
        baseRemaining: replay.baseRemaining,
        feeRemaining: replay.feeRemaining,
        totalRemaining: replay.totalRemaining,
        status: replay.status as InstallmentStatus,
      };
    } else if (isRegistrationFeePayment(payment)) {
      const enrollmentId = parseRegFeeEnrollmentId(payment);
      if (enrollmentId) {
        const enrollment = await tx.enrollment.findUnique({
          where: { id: enrollmentId },
          select: {
            id: true,
            batch: {
              select: { batchCode: true, registrationFee: true },
            },
          },
        });

        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollmentId },
            data: { regFeePaid: false },
          });

          reRecord = {
            type: "registration",
            enrollmentId,
            studentId: payment.studentId,
            studentName: payment.student.fullName,
            batchCode: enrollment.batch?.batchCode ?? null,
            registrationFee: Number(enrollment.batch?.registrationFee ?? 0),
          };
        }
      }
    }

    return {
      paymentId: payment.id,
      voidedAt: voidedAt.toISOString(),
      studentId: payment.studentId,
      installmentId: payment.installmentId,
      installmentLabel: payment.installment?.label ?? null,
      reRecord,
    };
  });
}
