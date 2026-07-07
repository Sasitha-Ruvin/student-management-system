"use client";

import Link from "next/link";

import { InlineLoader } from "@/components/ui/loading-state";
import type { AlumniListItem } from "@/types/api/alumni";

type AlumniTableProps = {
  items: AlumniListItem[];
  isLoading: boolean;
};

function formatGraduatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AlumniTable({ items, isLoading }: AlumniTableProps) {
  if (isLoading && items.length === 0) {
    return <InlineLoader label="Loading alumni…" />;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-secondary-300/50 bg-tertiary-100 px-5 py-8 text-center text-sm text-neutral-600">
        No alumni match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-secondary-300/50 bg-tertiary-100 shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-secondary-300/50 bg-secondary-100/40 text-[10px] font-medium tracking-widest text-neutral-600 uppercase">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Model code</th>
            <th className="px-4 py-3">Current batch</th>
            <th className="px-4 py-3">Previous batch</th>
            <th className="px-4 py-3">Graduated</th>
            <th className="px-4 py-3">IDs</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.alumniId}
              className="border-b border-secondary-300/30 last:border-0"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/students/${row.studentId}`}
                  className="font-medium text-primary-900 hover:underline"
                >
                  {row.fullName}
                </Link>
                <p className="text-xs text-neutral-600">{row.branchName}</p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-neutral-800">
                {row.modelCode}
              </td>
              <td className="px-4 py-3">
                {row.graduatedIntake ? (
                  <>
                    <p className="text-xs font-medium text-primary-900">
                      {row.graduatedIntake}
                    </p>
                    <p className="text-xs text-neutral-600">Pre-system intake</p>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-xs text-primary-900">{row.batchCode}</p>
                    <p className="text-xs text-neutral-600">{row.batchName}</p>
                  </>
                )}
              </td>
              <td className="px-4 py-3">
                {row.previousBatchCode ? (
                  <>
                    <p className="font-mono text-xs text-neutral-800">
                      {row.previousBatchCode}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {row.previousBatchName}
                    </p>
                  </>
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-800">
                {formatGraduatedDate(row.graduatedAt)}
              </td>
              <td className="px-4 py-3 font-mono text-[10px] leading-relaxed text-neutral-600">
                <div>ALU {row.alumniId.slice(-8)}</div>
                <div>STU {row.studentId.slice(-8)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
