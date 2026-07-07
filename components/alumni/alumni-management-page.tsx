"use client";

import { useEffect, useMemo, useState } from "react";

import { ListPagination } from "@/components/ui/list-pagination";

import { AddAlumniModal } from "@/components/alumni/add-alumni-modal";
import { AlumniPageHeader } from "@/components/alumni/alumni-page-header";
import { AlumniTable } from "@/components/alumni/alumni-table";
import { AlumniToolbar } from "@/components/alumni/alumni-toolbar";
import { useAlumni } from "@/hooks/use-alumni";
import { useAlumniFilters } from "@/hooks/use-alumni-filters";

export function AlumniManagementPage() {
  const filters = useAlumniFilters();
  const [addOpen, setAddOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const listQuery = useMemo(
    () => ({
      branchId: filters.branchId === "all" ? undefined : filters.branchId,
      batchId: filters.batchId === "all" ? undefined : filters.batchId,
      search: filters.search,
      page,
      limit: 50,
    }),
    [filters.branchId, filters.batchId, filters.search, page],
  );

  const { items, total, totalPages, isLoading, error, reload } =
    useAlumni(listQuery);

  useEffect(() => {
    setPage(1);
  }, [filters.branchId, filters.batchId, filters.search]);

  return (
    <div className="flex min-h-0 flex-col gap-6 pb-8">
      <AlumniPageHeader />

      {successMessage ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {successMessage}
        </p>
      ) : null}

      <AlumniToolbar
        batchId={filters.batchId}
        setBatchId={filters.setBatchId}
        batches={filters.batches}
        batchesLoading={filters.batchesLoading}
        search={filters.search}
        setSearch={filters.setSearch}
        totalCount={total}
        onAddClick={() => setAddOpen(true)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AlumniTable items={items} isLoading={isLoading} />

      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <AddAlumniModal
        open={addOpen}
        defaultBranchId={filters.branchId}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          setSuccessMessage("Alumni record added.");
          void reload();
        }}
      />
    </div>
  );
}
