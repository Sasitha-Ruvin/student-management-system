import type { EnrollmentStatus } from "@/app/generated/prisma";
import {
  mapPaymentHistoryItem,
  PAYMENT_SENSITIVE_SELECT,
} from "@/lib/payments/map-payment-record";
import { isRegistrationFeeRow } from "@/lib/payments/payment-sensitive";
import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import type { PaymentHistoryItem } from "@/types/api/payment";

const ACTIVE_ENROLLMENT: EnrollmentStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "ON_HOLD",
  "COMPLETED",
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type BatchPaymentHistoryPage = {
  items: PaymentHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getPaymentsByBatch(
  batchId: string,
  page = 1,
  limit = DEFAULT_LIMIT,
): Promise<BatchPaymentHistoryPage> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const where = {
    voidedAt: null,
    student: {
      enrollments: {
        some: {
          batchId,
          status: { in: ACTIVE_ENROLLMENT },
        },
      },
    },
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        installmentId: true,
        amount: true,
        paymentDate: true,
        method: true,
        createdAt: true,
        ...PAYMENT_SENSITIVE_SELECT,
        student: { select: { ...STUDENT_PII_SELECT } },
        installment: { select: { label: true } },
        invoice: { select: { invoiceNumber: true, pdfUrl: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take: safeLimit,
    }),
    prisma.payment.count({ where }),
  ]);

  const items: PaymentHistoryItem[] = rows.map((row) => {
    const item = mapPaymentHistoryItem(row);
    return {
      ...item,
      installmentLabel: row.installment?.label
        ? row.installment.label
        : isRegistrationFeeRow(row)
          ? "Registration fee"
          : null,
      studentName: row.student.fullName,
    };
  });

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
