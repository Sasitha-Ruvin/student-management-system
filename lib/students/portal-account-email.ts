import { sendPortalCredentials } from "@/lib/email/send-portal-credentials";

export async function emailPortalCredentials(opts: {
  studentEmail: string;
  studentName: string;
  password: string;
  isNewAccount: boolean;
  sendEmail: boolean;
}): Promise<{ emailSent: boolean; emailWarning?: string }> {
  if (!opts.sendEmail) {
    return { emailSent: false };
  }

  try {
    await sendPortalCredentials({
      studentEmail: opts.studentEmail,
      studentName: opts.studentName,
      password: opts.password,
      isNewAccount: opts.isNewAccount,
    });
    return { emailSent: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to send login email";
    return { emailSent: false, emailWarning: message };
  }
}
