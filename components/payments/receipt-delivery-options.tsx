"use client";

type ReceiptDeliveryOptionsProps = {
  sendEmail: boolean;
  onSendEmailChange: (value: boolean) => void;
  sendSms: boolean;
  onSendSmsChange: (value: boolean) => void;
  studentEmail: string | null;
  smsPhone: string | null;
  smsPhoneValid: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
  loading?: boolean;
};

export function ReceiptDeliveryOptions({
  sendEmail,
  onSendEmailChange,
  sendSms,
  onSendSmsChange,
  studentEmail,
  smsPhone,
  smsPhoneValid,
  emailConfigured,
  smsConfigured,
  loading = false,
}: ReceiptDeliveryOptionsProps) {
  if (loading) {
    return (
      <p className="text-sm text-neutral-600">Loading receipt delivery options…</p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-secondary-300/50 bg-secondary-100/20 p-4">
      <p className="text-xs font-medium tracking-wide text-neutral-600 uppercase">
        Send receipt
      </p>
      <p className="text-xs text-neutral-600">
        PDF is generated when payment is saved. Email attaches the PDF; SMS sends
        a summary with a download link (or notes it was emailed).
      </p>

      <label
        className={`flex items-start gap-2 ${emailConfigured ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
      >
        <input
          type="checkbox"
          checked={sendEmail}
          disabled={!emailConfigured}
          onChange={(e) => onSendEmailChange(e.target.checked)}
          className="mt-1 size-4 rounded border-secondary-400"
        />
        <span className="text-sm text-neutral-700">
          {emailConfigured && studentEmail ? (
            <>
              Email PDF receipt to{" "}
              <span className="font-medium">{studentEmail}</span> and admin
            </>
          ) : (
            <>Email — SMTP is not configured</>
          )}
        </span>
      </label>

      <label
        className={`flex items-start gap-2 ${smsConfigured && smsPhoneValid ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
      >
        <input
          type="checkbox"
          checked={sendSms}
          disabled={!smsConfigured || !smsPhoneValid}
          onChange={(e) => onSendSmsChange(e.target.checked)}
          className="mt-1 size-4 rounded border-secondary-400"
        />
        <span className="text-sm text-neutral-700">
          {!smsConfigured ? (
            <>SMS — Text.lk is not configured</>
          ) : smsPhoneValid && smsPhone ? (
            <>
              Send receipt by SMS to{" "}
              <span className="font-medium">{smsPhone}</span>
              {sendEmail ? (
                <> — summary text; PDF attached via email</>
              ) : (
                <> — includes PDF download link</>
              )}
            </>
          ) : (
            <>
              SMS — add a valid contact or WhatsApp number on the student profile
            </>
          )}
        </span>
      </label>
    </div>
  );
}
