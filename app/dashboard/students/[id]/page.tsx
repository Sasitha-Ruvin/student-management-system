import { notFound } from "next/navigation";

import { StudentDetailPage } from "@/components/students/student-detail-page";
import { fetchStudentDetailDecrypted } from "@/lib/students/student-queries";

type StudentDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentDetailRoute({
  params,
}: StudentDetailRouteProps) {
  const { id } = await params;
  const initialDetail = await fetchStudentDetailDecrypted(id);

  if (!initialDetail) {
    notFound();
  }

  return <StudentDetailPage studentId={id} initialDetail={initialDetail} />;
}
