type TextLkResponse = {
  status?: string;
  message?: string;
  data?: unknown;
};

function getSmsEndpoint(): string {
  return (
    process.env.TEXT_LK_SMS_API_ENDPOINT?.trim() ||
    "https://app.text.lk/api/v3/sms/send"
  );
}

export function isTextLkConfigured(): boolean {
  return Boolean(
    process.env.TEXT_LK_API_TOKEN?.trim() &&
      process.env.TEXT_LK_SENDER_ID?.trim(),
  );
}

async function parseTextLkJson(res: Response): Promise<TextLkResponse> {
  const text = await res.text();
  if (!text.trim()) {
    return { status: "error", message: `Empty response (${res.status})` };
  }
  try {
    return JSON.parse(text) as TextLkResponse;
  } catch {
    return {
      status: "error",
      message: `Invalid JSON from Text.lk (${res.status})`,
    };
  }
}

function assertTextLkSuccess(data: TextLkResponse, context: string): void {
  if (data.status === "success") {
    return;
  }
  const detail =
    data.message ??
    (data.status ? `Text.lk status: ${data.status}` : "Unknown Text.lk error");
  throw new Error(`${context}: ${detail}`);
}

/**
 * Sends a plain SMS via Text.lk v3 POST (Bearer token).
 */
export async function sendTextLkSms(
  recipient: string,
  message: string,
): Promise<void> {
  const apiToken = process.env.TEXT_LK_API_TOKEN?.trim();
  const senderId = process.env.TEXT_LK_SENDER_ID?.trim();

  if (!apiToken || !senderId) {
    throw new Error(
      "Text.lk is not configured (TEXT_LK_API_TOKEN, TEXT_LK_SENDER_ID)",
    );
  }

  const endpoint = getSmsEndpoint();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: "plain",
      message,
    }),
  });

  const data = await parseTextLkJson(res);

  if (!res.ok) {
    throw new Error(data.message ?? `Text.lk API error (${res.status})`);
  }

  assertTextLkSuccess(data, "Text.lk");
  console.info(`[textlk] SMS accepted for ${recipient.slice(0, 5)}***`);
}
