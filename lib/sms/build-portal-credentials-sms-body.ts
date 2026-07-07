import { getStudentPortalLoginUrl } from "@/lib/portal/portal-url";

const MAX_SMS_LENGTH = 480;
const ACADEMY_HEADER = "The Walk Model Academy";

export type BuildPortalCredentialsSmsBodyInput = {
  studentFirstName: string;
  studentEmail: string;
  password: string;
  loginUrl?: string;
  contactPhone: string | null;
};

function buildPortalCredentialsSuffix(contactPhone: string | null): string {
  return contactPhone ? `\n\nQuestions: ${contactPhone}` : "";
}

export function buildPortalCredentialsSmsBody(
  input: BuildPortalCredentialsSmsBodyInput,
): string {
  const loginUrl = input.loginUrl ?? getStudentPortalLoginUrl();
  const suffix = buildPortalCredentialsSuffix(input.contactPhone);

  const core = [
    ACADEMY_HEADER,
    `Hi ${input.studentFirstName},`,
    "",
    "Your student portal account is ready. Sign in with:",
    `Email: ${input.studentEmail}`,
    `Password: ${input.password}`,
    `Student Portal: ${loginUrl}`,
    "",
    "Keep your password private.",
  ].join("\n");

  const full = core + suffix;
  if (full.length <= MAX_SMS_LENGTH) {
    return full;
  }

  const reserved = suffix.length;
  const maxCore = Math.max(0, MAX_SMS_LENGTH - reserved);
  const trimmed = core.slice(0, maxCore) + "…";
  console.warn(
    `[sms] Portal credentials SMS truncated to ${trimmed.length + suffix.length} chars`,
  );
  return trimmed + suffix;
}
