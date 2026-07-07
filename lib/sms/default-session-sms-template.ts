/** Built-in fallback when no DB templates exist (matches seeded default). */
export const DEFAULT_SESSION_SMS_TEMPLATE_BODY = `{{academyName}}
Hi {{firstName}},

Session #{{sessionNumber}} | {{batchCode}}
{{sessionDate}}
{{branchLine}}

{{notice}}`;
