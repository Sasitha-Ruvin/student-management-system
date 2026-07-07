import { createEmailTransporter, getEmailFromAddress } from "@/lib/email/create-transporter";
import { getStudentPortalLoginUrl } from "@/lib/portal/portal-url";

export type SendPortalCredentialsOptions = {
  studentEmail: string;
  studentName: string;
  password: string;
  /** true when first-time account creation; false when admin reset a password */
  isNewAccount?: boolean;
};

export async function sendPortalCredentials(
  opts: SendPortalCredentialsOptions,
): Promise<void> {
  const { studentEmail, studentName, password, isNewAccount = true } = opts;
  const loginUrl = getStudentPortalLoginUrl();
  const transporter = await createEmailTransporter();
  const from = getEmailFromAddress();

  const subject = isNewAccount
    ? "Your Walk Model Agency student portal login"
    : "Your Walk Model Agency student portal password was updated";

  const intro = isNewAccount
    ? "Your student portal account has been created. Use the details below to sign in."
    : "An administrator has set a new password for your student portal account.";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a1a;">Walk Model Agency</h2>
  <p>Dear ${escapeHtml(studentName)},</p>
  <p>${intro}</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Login URL</td>
      <td style="padding:8px;border:1px solid #ddd;"><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Email</td>
      <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(studentEmail)}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-weight:600;">Password</td>
      <td style="padding:8px;border:1px solid #ddd;font-family:monospace;">${escapeHtml(password)}</td>
    </tr>
  </table>
  <p style="color:#666;font-size:13px;">Keep this password private. You can change it after signing in from your profile, or use &ldquo;Forgot password&rdquo; on the login page.</p>
  <p style="color:#666;font-size:13px;">Thank you,<br/>Walk Model Agency</p>
</body>
</html>`.trim();

  await transporter.sendMail({
    from,
    to: studentEmail,
    subject,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
