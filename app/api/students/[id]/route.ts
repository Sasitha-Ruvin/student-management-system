import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/require-admin";
import {
  deleteStudent,
  DeleteStudentError,
} from "@/lib/students/delete-student";
import {
  updateStudentWithEnrollments,
  UpdateStudentError,
} from "@/lib/students/update-student";
import { fetchStudentDetailApi } from "@/lib/students/student-queries";
import type { UpdateStudentBody } from "@/types/api/student";

type RouteContext = { params: Promise<{ id: string }> };

function parseUpdateBody(raw: unknown): UpdateStudentBody {
  if (typeof raw === "string") {
    return JSON.parse(raw) as UpdateStudentBody;
  }
  return raw as UpdateStudentBody;
}

// GET /api/students/[id] — sensitive PII as *Enc ciphertext (UI uses server-side decrypt)
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const student = await fetchStudentDetailApi(id);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json({ data: student });
}

// PUT /api/students/[id]
export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dataField = formData.get("data");

      if (!dataField || typeof dataField !== "string") {
        return NextResponse.json(
          { error: "Missing data field in form" },
          { status: 400 },
        );
      }

      const body = parseUpdateBody(dataField);
      const photoFile = formData.get("photo");
      const removePhoto = formData.get("removePhoto") === "true";

      const result = await updateStudentWithEnrollments(id, body, {
        photoFile:
          photoFile instanceof File && photoFile.size > 0 ? photoFile : null,
        removePhoto,
      });

      const data = await fetchStudentDetailApi(id);
      return NextResponse.json({
        data,
        ...(result.warnings.length > 0 ? { warnings: result.warnings } : {}),
      });
    }

    const body = parseUpdateBody(await request.json());
    const result = await updateStudentWithEnrollments(id, body);

    const data = await fetchStudentDetailApi(id);
    return NextResponse.json({
      data,
      ...(result.warnings.length > 0 ? { warnings: result.warnings } : {}),
    });
  } catch (e) {
    if (e instanceof UpdateStudentError) {
      return NextResponse.json(
        {
          error: e.message,
          ...(e.field ? { field: e.field } : {}),
          ...(e.errors ? { errors: e.errors } : {}),
        },
        { status: e.statusCode },
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    throw e;
  }
}

// DELETE /api/students/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    await deleteStudent(id);
    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    if (e instanceof DeleteStudentError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
