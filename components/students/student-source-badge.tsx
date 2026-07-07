import {
  isPendingWebsiteModelCode,
  isWebsiteSource,
  studentSourceLabel,
} from "@/lib/students/student-source";
import type { StudentSource } from "@/types/api/student";

type StudentSourceBadgeProps = {
  source: StudentSource | string;
  modelCode?: string;
  className?: string;
};

export function StudentSourceBadge({
  source,
  modelCode,
  className = "",
}: StudentSourceBadgeProps) {
  const pendingWebsite =
    modelCode != null &&
    isWebsiteSource(source) &&
    isPendingWebsiteModelCode(modelCode);

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        pendingWebsite
          ? "bg-violet-100 text-violet-900"
          : isWebsiteSource(source)
            ? "bg-sky-100 text-sky-900"
            : source === "MANUAL"
              ? "bg-neutral-200 text-neutral-700"
              : "bg-secondary-200 text-neutral-700",
        className,
      ].join(" ")}
    >
      {pendingWebsite ? "Website · Pending approval" : studentSourceLabel(source)}
    </span>
  );
}
