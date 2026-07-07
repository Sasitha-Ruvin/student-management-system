import type { InstallmentListItem } from "@/types/api/payment";

export type StudentInstallmentGroup = {
  studentId: string;
  studentName: string;
  modelCode: string;
  installments: InstallmentListItem[];
};

export function groupInstallmentsByStudent(
  items: InstallmentListItem[],
): StudentInstallmentGroup[] {
  const map = new Map<string, StudentInstallmentGroup>();

  for (const item of items) {
    let group = map.get(item.studentId);
    if (!group) {
      group = {
        studentId: item.studentId,
        studentName: item.studentName,
        modelCode: item.modelCode,
        installments: [],
      };
      map.set(item.studentId, group);
    }
    group.installments.push(item);
  }

  return Array.from(map.values()).map((g) => ({
    ...g,
    installments: [...g.installments].sort((a, b) => a.order - b.order),
  }));
}
