import {
  SESSION_SMS_PLACEHOLDERS,
  validateSessionSmsTemplateBody,
  type SessionSmsPlaceholder,
} from "@/lib/sms/session-sms-placeholders";

const MAX_SMS_LENGTH = 480;

export type SessionSmsTemplateContext = {
  academyName: string;
  studentFirstName: string;
  sessionNumber: number;
  batchCode: string;
  batchName: string;
  sessionDate: string;
  branchName: string;
  branchLine: string;
  contactPhone: string | null;
  notice: string;
};

function formatSessionDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBranchLine(
  branchName: string,
  branchLocation: string,
): string {
  const loc = branchLocation?.trim();
  return loc ? `${branchName}, ${loc}` : branchName;
}

export function buildSessionSmsContext(opts: {
  academyName: string;
  studentFirstName: string;
  sessionNumber: number;
  batchCode: string;
  batchName: string;
  scheduledAt: string;
  branchName: string;
  branchLocation: string;
  contactPhone: string | null;
  notice: string;
}): SessionSmsTemplateContext {
  return {
    academyName: opts.academyName,
    studentFirstName: opts.studentFirstName,
    sessionNumber: opts.sessionNumber,
    batchCode: opts.batchCode,
    batchName: opts.batchName,
    sessionDate: formatSessionDateTime(opts.scheduledAt),
    branchName: opts.branchName,
    branchLine: formatBranchLine(opts.branchName, opts.branchLocation),
    contactPhone: opts.contactPhone,
    notice: opts.notice.trim(),
  };
}

function resolvePlaceholder(
  key: SessionSmsPlaceholder,
  ctx: SessionSmsTemplateContext,
): string {
  switch (key) {
    case "academyName":
      return ctx.academyName;
    case "firstName":
      return ctx.studentFirstName;
    case "sessionNumber":
      return String(ctx.sessionNumber);
    case "batchCode":
      return ctx.batchCode;
    case "batchName":
      return ctx.batchName;
    case "sessionDate":
      return ctx.sessionDate;
    case "branchName":
      return ctx.branchName;
    case "branchLine":
      return ctx.branchLine;
    case "contactPhone":
      return ctx.contactPhone ?? "";
    case "notice":
      return ctx.notice;
    default:
      return "";
  }
}

/**
 * Renders a full SMS body from a template string and context.
 * Truncates {{notice}} first if the result exceeds 480 characters.
 */
export function renderSessionSmsTemplate(
  templateBody: string,
  ctx: SessionSmsTemplateContext,
): string {
  const validationError = validateSessionSmsTemplateBody(templateBody);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!templateBody.includes("{{notice}}")) {
    return stripSessionSmsQuestionsFooter(renderTemplate(templateBody, ctx));
  }

  const withoutNotice = templateBody.replace(/\{\{notice\}\}/g, "");
  const reserved = renderTemplate(withoutNotice, { ...ctx, notice: "" }).length;
  const maxNoticeLen = Math.max(0, MAX_SMS_LENGTH - reserved);

  let notice = ctx.notice;
  if (notice.length > maxNoticeLen) {
    const ellipsis = "…";
    const cut = Math.max(0, maxNoticeLen - ellipsis.length);
    notice = notice.slice(0, cut) + ellipsis;
    console.warn(
      `[sms] Notice truncated to ${notice.length} chars (max ${maxNoticeLen})`,
    );
  }

  return stripSessionSmsQuestionsFooter(
    renderTemplate(templateBody, { ...ctx, notice }),
  );
}

/** Legacy templates included a contact footer — strip it from outgoing SMS. */
export function stripSessionSmsQuestionsFooter(text: string): string {
  return text.replace(/\n+Questions:\s*[^\n]*\s*$/i, "").trimEnd();
}

function renderTemplate(
  templateBody: string,
  ctx: SessionSmsTemplateContext,
): string {
  return templateBody.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!SESSION_SMS_PLACEHOLDERS.includes(key as SessionSmsPlaceholder)) {
      return match;
    }
    return resolvePlaceholder(key as SessionSmsPlaceholder, ctx);
  });
}
