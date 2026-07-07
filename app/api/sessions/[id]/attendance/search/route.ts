import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import { prisma } from "@/lib/prisma";
import {
  buildStudentTextSearchWhere,
  decryptStudentPii,
  STUDENT_PII_SELECT,
} from "@/lib/students/student-pii";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/sessions/[id]/attendance/search?q=<term>
// Cross-branch student search — finds any student in the system for the
// "Add Cross-Branch Student" workflow.
export async function GET(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  // Validate session exists (ensures the route param is meaningful)
  const { id: sessionId } = await context.params;
  const sessionExists = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, batchId: true },
  });

  if (!sessionExists) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 },
    );
  }

  const students = await prisma.student.findMany({
    where: {
      OR: buildStudentTextSearchWhere(q),
    },
    select: {
      id: true,
      modelCode: true,
      photoUrl: true,
      ...STUDENT_PII_SELECT,
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          batch: { select: { batchCode: true } },
        },
        take: 1,
      },
    },
    take: 20,
    orderBy: { modelCode: "asc" },
  });

  const results = students.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    modelCode: s.modelCode,
    photoUrl: s.photoUrl,
    currentBatchCode: s.enrollments[0]?.batch?.batchCode ?? null,
  }));

  return NextResponse.json({ data: results });
}
