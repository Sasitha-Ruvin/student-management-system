import { DEFAULT_SESSION_SMS_TEMPLATE_BODY } from "@/lib/sms/default-session-sms-template";
import {
  buildSessionSmsContext,
  formatBranchLine,
  renderSessionSmsTemplate,
} from "@/lib/sms/render-session-sms-template";

export type BuildSessionSmsBodyInput = {
  sessionNumber: number;
  batchCode: string;
  batchName: string;
  scheduledAt: string;
  branchName: string;
  branchLocation: string;
  message: string;
  contactPhone: string | null;
  studentFirstName: string;
  academyName?: string;
  templateBody?: string;
};

/** Session header block (no admin notice) — for previews of layout-only sections. */
export function buildSessionSmsPrefix(input: BuildSessionSmsBodyInput): string {
  const template =
    input.templateBody ??
    DEFAULT_SESSION_SMS_TEMPLATE_BODY.replace(/\{\{notice\}\}/g, "");
  const ctx = buildSessionSmsContext({
    academyName: input.academyName ?? "The Walk Model Academy",
    studentFirstName: input.studentFirstName,
    sessionNumber: input.sessionNumber,
    batchCode: input.batchCode,
    batchName: input.batchName,
    scheduledAt: input.scheduledAt,
    branchName: input.branchName,
    branchLocation: input.branchLocation,
    contactPhone: input.contactPhone,
    notice: "",
  });
  return renderSessionSmsTemplate(template, ctx);
}

export function buildSessionSmsBody(input: BuildSessionSmsBodyInput): string {
  const templateBody = input.templateBody ?? DEFAULT_SESSION_SMS_TEMPLATE_BODY;
  const ctx = buildSessionSmsContext({
    academyName: input.academyName ?? "The Walk Model Academy",
    studentFirstName: input.studentFirstName,
    sessionNumber: input.sessionNumber,
    batchCode: input.batchCode,
    batchName: input.batchName,
    scheduledAt: input.scheduledAt,
    branchName: input.branchName,
    branchLocation: input.branchLocation,
    contactPhone: input.contactPhone,
    notice: input.message,
  });
  return renderSessionSmsTemplate(templateBody, ctx);
}

export { formatBranchLine };
