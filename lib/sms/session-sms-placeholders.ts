/** Placeholders allowed in session SMS templates (mustache-style). */
export const SESSION_SMS_PLACEHOLDERS = [
  "academyName",
  "firstName",
  "sessionNumber",
  "batchCode",
  "batchName",
  "sessionDate",
  "branchName",
  "branchLine",
  "contactPhone",
  "notice",
] as const;

export type SessionSmsPlaceholder = (typeof SESSION_SMS_PLACEHOLDERS)[number];

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export function extractSessionSmsPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    found.add(match[1]!);
  }
  return [...found];
}

export function validateSessionSmsTemplateBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Template body cannot be empty";

  const unknown = extractSessionSmsPlaceholders(trimmed).filter(
    (p) => !SESSION_SMS_PLACEHOLDERS.includes(p as SessionSmsPlaceholder),
  );
  if (unknown.length > 0) {
    return `Unknown placeholders: ${unknown.map((p) => `{{${p}}}`).join(", ")}`;
  }

  return null;
}

export function templateRequiresNotice(body: string): boolean {
  return body.includes("{{notice}}");
}
