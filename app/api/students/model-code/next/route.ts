import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { generateModelCode } from "@/lib/students/model-code-generator";
import { prisma } from "@/lib/prisma";

/** GET /api/students/model-code/next — suggested model code for website approval */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const modelCode = await generateModelCode(prisma);
  return NextResponse.json({ data: { modelCode } });
}
