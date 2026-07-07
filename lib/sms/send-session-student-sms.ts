import { buildSessionSmsBody } from "@/lib/sms/build-session-sms-body";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { persistSessionStudentMessages } from "@/lib/sms/persist-session-student-messages";
import { isTextLkConfigured, sendTextLkSms } from "@/lib/sms/textlk-client";
import type { SessionStudentMessageContext } from "@/lib/notifications/session-student-message-context";

export type SessionStudentMessageSmsResult = {
  sent: number;
  failed: number;
  skippedNoPhone: number;
  skippedNotConfigured: number;
  totalEnrolled: number;
  /** First API error message when failed > 0 (for admin feedback) */
  lastError?: string;
};

export type SendSessionStudentSmsOptions = {
  sessionId: string;
  context: SessionStudentMessageContext;
  templateBody: string;
  templateId: string | null;
  academyName: string;
  notice: string;
};

export async function sendSessionStudentSms(
  opts: SendSessionStudentSmsOptions,
): Promise<SessionStudentMessageSmsResult> {
  const { sessionId, context, templateBody, templateId, academyName, notice } = opts;
  const totalEnrolled = context.enrollments.length;
  const { session, contactPhone } = context;

  const persistRows: Parameters<typeof persistSessionStudentMessages>[0] = [];

  if (!isTextLkConfigured()) {
    console.warn("[sms] TEXT_LK_API_TOKEN or TEXT_LK_SENDER_ID missing");

    for (const enrollment of context.enrollments) {
      const firstName =
        enrollment.fullName.split(" ")[0] ?? enrollment.fullName;
      persistRows.push({
        sessionId,
        studentId: enrollment.studentId,
        notice,
        body: buildSessionSmsBody({
          sessionNumber: session.sessionNumber,
          batchCode: session.batchCode,
          batchName: session.batchName,
          scheduledAt: session.scheduledAt,
          branchName: session.branchName,
          branchLocation: session.branchLocation,
          message: notice,
          contactPhone,
          studentFirstName: firstName,
          academyName,
          templateBody,
        }),
        templateId,
        smsSent: false,
      });
    }

    await persistSessionStudentMessages(persistRows);

    return {
      sent: 0,
      failed: 0,
      skippedNoPhone: 0,
      skippedNotConfigured: totalEnrolled,
      totalEnrolled,
    };
  }

  let sent = 0;
  let failed = 0;
  let skippedNoPhone = 0;
  let lastError: string | undefined;

  for (const enrollment of context.enrollments) {
    const firstName =
      enrollment.fullName.split(" ")[0] ?? enrollment.fullName;
    const body = buildSessionSmsBody({
      sessionNumber: session.sessionNumber,
      batchCode: session.batchCode,
      batchName: session.batchName,
      scheduledAt: session.scheduledAt,
      branchName: session.branchName,
      branchLocation: session.branchLocation,
      message: notice,
      contactPhone,
      studentFirstName: firstName,
      academyName,
      templateBody,
    });

    const recipient = normalizeSriLankaMobile(enrollment.contactNumber);
    let smsSent = false;

    if (!recipient) {
      console.warn(
        `[sms] Skip ${enrollment.fullName}: invalid phone "${enrollment.contactNumber}"`,
      );
      skippedNoPhone += 1;
    } else {
      try {
        await sendTextLkSms(recipient, body);
        smsSent = true;
        sent += 1;
      } catch (err) {
        failed += 1;
        lastError =
          err instanceof Error ? err.message : String(err);
        console.error("[sms] Send failed:", lastError);
      }
    }

    persistRows.push({
      sessionId,
      studentId: enrollment.studentId,
      notice,
      body,
      templateId,
      smsSent,
    });
  }

  await persistSessionStudentMessages(persistRows);

  console.info(
    `[sms] Session message: sent=${sent} failed=${failed} skippedPhone=${skippedNoPhone} enrolled=${totalEnrolled}`,
  );

  return {
    sent,
    failed,
    skippedNoPhone,
    skippedNotConfigured: 0,
    totalEnrolled,
    lastError,
  };
}
