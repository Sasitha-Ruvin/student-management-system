import { NextResponse } from "next/server";

import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import {
  deleteSessionSmsTemplate,
  SessionSmsTemplateError,
  updateSessionSmsTemplate,
} from "@/lib/sms/session-sms-template-mutations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: {
    name?: string;
    body?: string;
    isDefault?: boolean;
    sortOrder?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const template = await updateSessionSmsTemplate(id, body);
    invalidateSettings();
    return NextResponse.json({ data: template });
  } catch (err) {
    if (err instanceof SessionSmsTemplateError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to update template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteSessionSmsTemplate(id);
    invalidateSettings();
    return NextResponse.json({ data: { message: "Template deleted" } });
  } catch (err) {
    if (err instanceof SessionSmsTemplateError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
