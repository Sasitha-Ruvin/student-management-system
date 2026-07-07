import {
  buildSessionEditNotificationSummary,
  describeSmsOutcome,
} from "@/lib/notifications/build-session-edit-warning";
import { loadSessionStudentMessageContext } from "@/lib/notifications/session-student-message-context";
import { prisma } from "@/lib/prisma";
import { resolveSessionSmsTemplate } from "@/lib/sms/session-sms-template-queries";
import { templateRequiresNotice } from "@/lib/sms/session-sms-placeholders";
import { sendSessionStudentSms } from "@/lib/sms/send-session-student-sms";
import type { SessionEditSmsResult } from "@/types/api/batch";

export type SessionStudentSmsRequest = {
  sessionId: string;
  notifyStudents?: boolean;
  studentMessage?: string;
  templateId?: string | null;
};

export type SessionStudentSmsResponse = {
  smsResult?: SessionEditSmsResult;
  message?: string;
  warning?: string;
  error?: string;
  statusCode?: number;
};

export async function sendSessionStudentSmsIfRequested(
  input: SessionStudentSmsRequest,
): Promise<SessionStudentSmsResponse | null> {
  if (!input.notifyStudents) return null;

  const templateId = input.templateId ?? null;
  const studentMessage =
    input.studentMessage?.trim() ? input.studentMessage.trim() : "";

  const template = await resolveSessionSmsTemplate(templateId);
  const needsNotice = templateRequiresNotice(template.body);

  if (needsNotice && !studentMessage) {
    return {
      error: "Message is required for this template",
      statusCode: 400,
    };
  }

  const [context, academySettings] = await Promise.all([
    loadSessionStudentMessageContext(input.sessionId),
    prisma.academySettings.findUnique({
      where: { id: "default" },
      select: { academyName: true },
    }),
  ]);

  const smsResult = await sendSessionStudentSms({
    sessionId: input.sessionId,
    context,
    templateBody: template.body,
    templateId: template.id,
    academyName: academySettings?.academyName ?? "The Walk Model Academy",
    notice: studentMessage,
  });

  const smsOutcome = describeSmsOutcome(smsResult);

  if (!smsOutcome.success) {
    return {
      smsResult,
      error: smsOutcome.message,
      statusCode: 422,
    };
  }

  const { message, warning } = buildSessionEditNotificationSummary(
    undefined,
    smsResult,
  );

  return { smsResult, message, warning };
}
