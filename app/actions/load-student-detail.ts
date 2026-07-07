"use server";

import { getRequestAdmin } from "@/lib/api/request-admin";
import { fetchStudentDetailDecrypted } from "@/lib/students/student-queries";
import type { StudentDetail } from "@/types/api/student";

/** Decrypted student detail for admin UI only (not exposed on GET /api/students/[id]). */
export async function loadStudentDetailForAdmin(
  studentId: string,
): Promise<StudentDetail> {
  const admin = await getRequestAdmin();
  if (!admin) {
    throw new Error("Unauthorized");
  }

  const detail = await fetchStudentDetailDecrypted(studentId);
  if (!detail) {
    throw new Error("Student not found");
  }

  return detail;
}
