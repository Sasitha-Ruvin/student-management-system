import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import {
  listRegistrationEyeColors,
  listRegistrationHairColors,
  listRegistrationModelingInterests,
  listRegistrationSkinColors,
} from "@/lib/registration/registration-option-queries";

/** GET /api/registration/options — active options for registration wizard */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [skinColors, modelingInterests, eyeColors, hairColors] = await Promise.all([
    listRegistrationSkinColors(true),
    listRegistrationModelingInterests(true),
    listRegistrationEyeColors(true),
    listRegistrationHairColors(true),
  ]);

  return NextResponse.json({
    data: { skinColors, modelingInterests, eyeColors, hairColors },
  });
}
