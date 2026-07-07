import { buildPortalCredentialsSmsBody } from "@/lib/sms/build-portal-credentials-sms-body";
import { normalizeSriLankaMobile } from "@/lib/sms/normalize-sri-lanka-mobile";
import { isTextLkConfigured, sendTextLkSms } from "@/lib/sms/textlk-client";
import { resolveStudentPhone } from "@/lib/students/resolve-student-phone";

export async function smsPortalCredentials(opts: {
  contactNumber: string;
  whatsappNumber: string;
  studentName: string;
  studentEmail: string;
  password: string;
  sendSms: boolean;
  academyContactPhone: string | null;
}): Promise<{ smsSent: boolean; smsWarning?: string }> {
  if (!opts.sendSms) {
    return { smsSent: false };
  }

  const rawPhone = resolveStudentPhone(opts.contactNumber, opts.whatsappNumber);
  const recipient = normalizeSriLankaMobile(rawPhone);
  if (!recipient) {
    return {
      smsSent: false,
      smsWarning: rawPhone
        ? `Invalid mobile number on file (${rawPhone})`
        : "No contact or WhatsApp number on the student profile",
    };
  }

  if (!isTextLkConfigured()) {
    return {
      smsSent: false,
      smsWarning: "Text.lk is not configured (TEXT_LK_API_TOKEN, TEXT_LK_SENDER_ID)",
    };
  }

  const firstName = opts.studentName.split(" ")[0] ?? opts.studentName;
  const body = buildPortalCredentialsSmsBody({
    studentFirstName: firstName,
    studentEmail: opts.studentEmail,
    password: opts.password,
    contactPhone: opts.academyContactPhone,
  });

  try {
    await sendTextLkSms(recipient, body);
    return { smsSent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send SMS";
    return { smsSent: false, smsWarning: message };
  }
}
