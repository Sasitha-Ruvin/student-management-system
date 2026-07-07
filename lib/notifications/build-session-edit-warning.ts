import type {
  SessionEditEmailResult,
  SessionEditSmsResult,
} from "@/types/api/batch";

/** Human-readable SMS outcome for toasts and API errors. */
export function describeSmsOutcome(sms?: SessionEditSmsResult): {
  success: boolean;
  message: string;
  warning?: string;
} {
  if (!sms) {
    return {
      success: false,
      message: "No SMS delivery status returned from server.",
    };
  }

  if (sms.skippedNotConfigured > 0) {
    return {
      success: false,
      message:
        "SMS is not configured. Set TEXT_LK_API_TOKEN and TEXT_LK_SENDER_ID in .env, then restart the dev server.",
    };
  }

  if (sms.totalEnrolled === 0) {
    return {
      success: false,
      message:
        "No enrolled students in this batch. Assign students to the batch first.",
    };
  }

  const parts: string[] = [];
  const warnings: string[] = [];

  if (sms.sent > 0) {
    parts.push(
      `SMS sent to ${sms.sent} of ${sms.totalEnrolled} enrolled student${sms.sent === 1 ? "" : "s"}.`,
    );
  }

  if (sms.failed > 0) {
    const err = sms.lastError ? ` (${sms.lastError})` : "";
    warnings.push(`${sms.failed} SMS failed${err}`);
  }

  if (sms.skippedNoPhone > 0) {
    warnings.push(
      `${sms.skippedNoPhone} student(s) skipped — missing or invalid phone (use 07xxxxxxxx)`,
    );
  }

  if (sms.sent === 0) {
    return {
      success: false,
      message:
        warnings.length > 0
          ? warnings.join("; ")
          : "No SMS were sent. Check student phone numbers and Text.lk dashboard.",
      warning: warnings.length > 0 ? warnings.join("; ") : undefined,
    };
  }

  return {
    success: true,
    message: parts.join(" "),
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

export function buildSessionEditNotificationSummary(
  emailResult?: SessionEditEmailResult,
  smsResult?: SessionEditSmsResult,
): { message: string; warning?: string; success: boolean } {
  const sms = describeSmsOutcome(smsResult);
  const parts: string[] = [];
  const warnings: string[] = [];

  if (emailResult) {
    const { sent, failed, skippedNoEmail } = emailResult;
    if (sent > 0) {
      parts.push(
        `Email sent to ${sent} student${sent === 1 ? "" : "s"}.`,
      );
    }
    if (failed > 0) {
      warnings.push(`${failed} email(s) failed`);
    }
    if (sent === 0 && skippedNoEmail > 0) {
      warnings.push(
        `${skippedNoEmail} student(s) have no email on file`,
      );
    }
  }

  if (sms.success) {
    parts.push(sms.message);
    if (sms.warning) warnings.push(sms.warning);
  } else {
    warnings.push(sms.message);
    if (sms.warning) warnings.push(sms.warning);
  }

  const message =
    parts.length > 0 ? parts.join(" ") : warnings.join("; ") || "Done.";
  const warning =
    warnings.length > 0 && parts.length > 0
      ? warnings.join("; ") + "."
      : undefined;

  return {
    success: sms.success && (emailResult ? (emailResult.sent ?? 0) > 0 : true),
    message,
    warning,
  };
}
