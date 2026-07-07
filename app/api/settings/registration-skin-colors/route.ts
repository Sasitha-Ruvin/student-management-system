import { NextResponse } from "next/server";

import { invalidateSettings } from "@/lib/api/invalidate-cache";
import { requireAdmin } from "@/lib/api/require-admin";
import {
  createRegistrationOption,
  listRegistrationSkinColors,
  RegistrationOptionError,
} from "@/lib/registration/registration-option-mutations";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const options = await listRegistrationSkinColors();
  return NextResponse.json({ data: options });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: { label?: string; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const option = await createRegistrationOption("skinColor", {
      label: body.label ?? "",
      isActive: body.isActive,
    });
    invalidateSettings();
    return NextResponse.json({ data: option }, { status: 201 });
  } catch (err) {
    if (err instanceof RegistrationOptionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Failed to create option";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
