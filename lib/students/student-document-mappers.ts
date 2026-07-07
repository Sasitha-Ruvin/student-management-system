import type { StudentDocument } from "@/app/generated/prisma";
import { studentDocumentProxyUrl } from "@/lib/storage/proxy-urls";

export type StudentDocumentDto = {
  id: string;
  type: StudentDocument["type"];
  mimeType: string;
  sortOrder: number;
  url: string;
  createdAt: string;
};

export function toStudentDocumentDto(
  studentId: string,
  doc: Pick<
    StudentDocument,
    "id" | "type" | "mimeType" | "sortOrder" | "createdAt"
  >,
): StudentDocumentDto {
  return {
    id: doc.id,
    type: doc.type,
    mimeType: doc.mimeType,
    sortOrder: doc.sortOrder,
    url: studentDocumentProxyUrl(studentId, doc.id),
    createdAt: doc.createdAt.toISOString(),
  };
}
