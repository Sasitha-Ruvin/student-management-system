import { prisma } from "@/lib/prisma";

export type PersistSessionStudentMessageInput = {
  sessionId: string;
  studentId: string;
  notice: string;
  body: string;
  templateId: string | null;
  smsSent: boolean;
};

export async function persistSessionStudentMessages(
  rows: PersistSessionStudentMessageInput[],
): Promise<void> {
  if (rows.length === 0) return;

  await prisma.sessionStudentMessage.createMany({
    data: rows.map((row) => ({
      sessionId: row.sessionId,
      studentId: row.studentId,
      notice: row.notice || null,
      body: row.body,
      templateId: row.templateId,
      smsSent: row.smsSent,
    })),
  });
}
