import { Suspense } from "react";

import { AlumniManagementPage } from "@/components/alumni/alumni-management-page";
import { InlineLoader } from "@/components/ui/loading-state";

export default function AlumniPage() {
  return (
    <Suspense fallback={<InlineLoader label="Loading alumni…" />}>
      <AlumniManagementPage />
    </Suspense>
  );
}
