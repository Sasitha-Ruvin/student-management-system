import { validatePortalPassword } from "@/lib/auth/portal-password";
import { prisma } from "@/lib/prisma";
import { applyPortalPassword } from "@/lib/students/apply-portal-password";
import { emailPortalCredentials } from "@/lib/students/portal-account-email";
import { fetchStudentByIdOrNull } from "@/lib/students/student-queries";

export type SetPortalPasswordResult =
  | { ok: true; email: string; password: string; emailSent: boolean; emailWarning?: string }
  | { ok: false; status: number; error: string };

export async function setStudentPortalPassword(
  studentId: string,
  newPassword: string,
  sendEmail: boolean,
): Promise<SetPortalPasswordResult> {
  const student = await fetchStudentByIdOrNull(studentId);

  if (!student) {
    return { ok: false, status: 404, error: "Student not found" };
  }

  if (!student.supabaseId) {
    return {
      ok: false,
      status: 400,
      error: "This student does not have a portal account yet",
    };
  }

  const passwordError = validatePortalPassword(newPassword);
  if (passwordError) {
    return { ok: false, status: 400, error: passwordError };
  }

  const applied = await applyPortalPassword(student.supabaseId, newPassword);
  if (!applied.ok) {
    return { ok: false, status: 400, error: applied.error };
  }

  if (!student.isLoginEnabled) {
    await prisma.student.update({
      where: { id: studentId },
      data: { isLoginEnabled: true, loginDisabledNote: null },
    });
  }

  const { emailSent, emailWarning } = await emailPortalCredentials({
    studentEmail: student.email,
    studentName: student.fullName,
    password: newPassword,
    isNewAccount: false,
    sendEmail,
  });

  return {
    ok: true,
    email: student.email,
    password: newPassword,
    emailSent,
    ...(emailWarning ? { emailWarning } : {}),
  };
}
