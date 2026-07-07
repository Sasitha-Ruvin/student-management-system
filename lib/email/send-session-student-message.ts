import {
  createEmailTransporter,
  getEmailFromAddress,
} from "@/lib/email/create-transporter";
import type { SessionStudentMessageContext } from "@/lib/notifications/session-student-message-context";
import { loadSessionStudentMessageContext } from "@/lib/notifications/session-student-message-context";

export type SessionStudentMessageEmailResult = {
  sent: number;
  failed: number;
  skippedNoEmail: number;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSessionDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildEmailHtml(opts: {
  studentName: string;
  sessionNumber: number;
  batchCode: string;
  batchName: string;
  scheduledAt: string;
  branchName: string;
  branchLocation: string;
  message: string;
  contactPhone: string | null;
}): string {
  const messageHtml = escapeHtml(opts.message).replace(/\n/g, "<br />");
  const contactLine = opts.contactPhone
    ? `<p style="margin-top:24px;font-size:13px;color:#666;">Questions? Contact the academy at ${escapeHtml(opts.contactPhone)}.</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:14px;color:#666;margin:0 0 8px;">The Walk Model Academy</p>
  <h1 style="font-size:20px;margin:0 0 16px;">Session update</h1>
  <p style="margin:0 0 16px;">Hi ${escapeHtml(opts.studentName)},</p>
  <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Session #${opts.sessionNumber}</strong> · ${escapeHtml(opts.batchCode)}</p>
    <p style="margin:0 0 8px;">${escapeHtml(opts.batchName)}</p>
    <p style="margin:0 0 8px;">${escapeHtml(formatSessionDateTime(opts.scheduledAt))}</p>
    <p style="margin:0;">${escapeHtml(opts.branchName)}${opts.branchLocation ? ` · ${escapeHtml(opts.branchLocation)}` : ""}</p>
  </div>
  <div style="font-size:15px;white-space:pre-wrap;">${messageHtml}</div>
  ${contactLine}
  <p style="margin-top:32px;font-size:12px;color:#999;">This message was sent regarding your enrolled batch session.</p>
</body>
</html>`;
}

export async function sendSessionStudentMessage(
  contextOrSessionId: SessionStudentMessageContext | string,
  message: string,
): Promise<SessionStudentMessageEmailResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { sent: 0, failed: 0, skippedNoEmail: 0 };
  }

  const context =
    typeof contextOrSessionId === "string"
      ? await loadSessionStudentMessageContext(contextOrSessionId)
      : contextOrSessionId;

  const transporter = await createEmailTransporter();
  const from = getEmailFromAddress();
  const subject = `Session update — ${context.session.batchCode} Session #${context.session.sessionNumber}`;
  const { session, contactPhone } = context;

  const results = await Promise.allSettled(
    context.enrollments.map(async (enrollment) => {
      const email = enrollment.email;
      if (!email) {
        return "skipped" as const;
      }

      const html = buildEmailHtml({
        studentName:
          enrollment.fullName.split(" ")[0] ?? enrollment.fullName,
        sessionNumber: session.sessionNumber,
        batchCode: session.batchCode,
        batchName: session.batchName,
        scheduledAt: session.scheduledAt,
        branchName: session.branchName,
        branchLocation: session.branchLocation,
        message: trimmed,
        contactPhone,
      });

      await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
      });
      return "sent" as const;
    }),
  );

  let sent = 0;
  let failed = 0;
  let skippedNoEmail = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value === "sent") sent += 1;
      else skippedNoEmail += 1;
    } else {
      failed += 1;
    }
  }

  return { sent, failed, skippedNoEmail };
}
