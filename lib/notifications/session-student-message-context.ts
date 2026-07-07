import { prisma } from "@/lib/prisma";
import { decryptStudentPii, STUDENT_PII_SELECT } from "@/lib/students/student-pii";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

export type SessionStudentMessageEnrollment = {
  studentId: string;
  fullName: string;
  email: string | null;
  /** contactNumber first, then whatsappNumber */
  contactNumber: string;
};

export type SessionStudentMessageContext = {
  session: {
    sessionNumber: number;
    scheduledAt: string;
    batchCode: string;
    batchName: string;
    branchName: string;
    branchLocation: string;
  };
  contactPhone: string | null;
  enrollments: SessionStudentMessageEnrollment[];
};

export async function loadSessionStudentMessageContext(
  sessionId: string,
): Promise<SessionStudentMessageContext> {
  const [session, settings] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        sessionNumber: true,
        scheduledAt: true,
        batchId: true,
        batch: { select: { batchCode: true, name: true } },
        branch: { select: { name: true, location: true } },
      },
    }),
    prisma.academySettings.findUnique({
      where: { id: "default" },
      select: { contactPhone: true },
    }),
  ]);

  if (!session?.batch) {
    throw new Error("Session not found");
  }

  const enrollmentRows = await prisma.enrollment.findMany({
    where: {
      batchId: session.batchId,
      status: { notIn: ["DROPPED", "UNASSIGNED"] },
    },
    select: {
      student: {
        select: {
          id: true,
          ...STUDENT_PII_SELECT,
        },
      },
    },
  });

  return {
    session: {
      sessionNumber: session.sessionNumber,
      scheduledAt: session.scheduledAt.toISOString(),
      batchCode: session.batch.batchCode,
      batchName: session.batch.name,
      branchName: session.branch.name,
      branchLocation: session.branch.location ?? "",
    },
    contactPhone: settings?.contactPhone ?? null,
    enrollments: enrollmentRows.map((e) => {
      const pii = decryptStudentPii(e.student);
      return {
        studentId: e.student.id,
        fullName: e.student.fullName,
        email: e.student.email,
        contactNumber: resolveStudentPhone(
          pii.contactNumber,
          pii.whatsappNumber,
        ),
      };
    }),
  };
}
