import { NextResponse } from "next/server";

import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import {
  createSessionSmsTemplate,
  listSessionSmsTemplates,
  SessionSmsTemplateError,
} from "@/lib/sms/session-sms-template-mutations";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const templates = await listSessionSmsTemplates();
  return NextResponse.json({ data: templates });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: { name?: string; body?: string; isDefault?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const template = await createSessionSmsTemplate({
      name: body.name ?? "",
      body: body.body ?? "",
      isDefault: body.isDefault,
    });
    invalidateSettings();
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionSmsTemplateError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
