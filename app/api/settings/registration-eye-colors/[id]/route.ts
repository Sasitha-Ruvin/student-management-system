import { NextResponse } from "next/server";

import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import {
  deleteRegistrationOption,
  RegistrationOptionError,
  updateRegistrationOption,
} from "@/lib/registration/registration-option-mutations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  let body: { label?: string; isActive?: boolean; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const option = await updateRegistrationOption("eyeColor", id, body);
    invalidateSettings();
    return NextResponse.json({ data: option });
  } catch (err) {
    if (err instanceof RegistrationOptionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to update option";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteRegistrationOption("eyeColor", id);
    invalidateSettings();
    return NextResponse.json({ data: { message: "Option deleted" } });
  } catch (err) {
    if (err instanceof RegistrationOptionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to delete option";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
