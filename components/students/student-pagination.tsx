"use client";

import { BatchPagination } from "@/components/batches/batch-pagination";

type StudentPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function StudentPagination(props: StudentPaginationProps) {
  return <BatchPagination {...props} />;
}
