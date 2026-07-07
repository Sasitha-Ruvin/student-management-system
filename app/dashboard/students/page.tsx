import { Suspense } from "react";

import { StudentManagementPage } from "@/components/students/student-management-page";
import { InlineLoader } from "@/components/ui/loading-state";

export default function StudentsPage() {
  return (
    <Suspense fallback={<InlineLoader label="Loading students…" />}>
      <StudentManagementPage />
    </Suspense>
  );
}
