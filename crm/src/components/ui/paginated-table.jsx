import React, { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CrmTableCard } from "@/components/ui/crm-card";
import { cn } from "@/lib/utils";

/**
 * Server-driven table + pagination + optional bulk selection slot.
 */
export function PaginatedTable({
  columns,
  data = [],
  loading = false,
  empty,
  onRowClick,
  rowTestId,
  // pagination
  page = 1,
  limit = 25,
  total = 0,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
  // sort (server)
  sortKey,
  sortDir,
  onSortChange,
  serverSort = false,
  // selection
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  density = "compact",
  stickyHeader = true,
  className,
  testId = "paginated-table",
}) {
  const selected = useMemo(() => {
    if (selectedIds instanceof Set) return selectedIds;
    return new Set(selectedIds || []);
  }, [selectedIds]);

  const cols = useMemo(() => {
    if (!selectable) return columns;
    return [
      {
        key: "_select",
        label: (
          <input
            type="checkbox"
            checked={data.length > 0 && data.every((r) => selected.has(r.id))}
            onChange={(e) => {
              if (!onSelectionChange) return;
              if (e.target.checked) onSelectionChange(new Set(data.map((r) => r.id)));
              else onSelectionChange(new Set());
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`${testId}-select-all`}
          />
        ),
        sortable: false,
        className: "w-8",
        render: (row) => (
          <input
            type="checkbox"
            checked={selected.has(row.id)}
            onChange={() => {
              if (!onSelectionChange) return;
              const next = new Set(selected);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              onSelectionChange(next);
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`${testId}-select-${String(row.id || "").slice(0, 8)}`}
          />
        ),
      },
      ...columns,
    ];
  }, [columns, selectable, data, selected, onSelectionChange, testId]);

  return (
    <CrmTableCard className={cn(className)} data-testid={testId}>
      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-navy/20 bg-navy/5">
          <span className="text-xs font-medium text-ink">{selected.size} selected</span>
          {bulkActions}
        </div>
      )}
      <DataTable
        columns={cols}
        data={data}
        loading={loading}
        empty={empty}
        onRowClick={onRowClick}
        rowTestId={rowTestId}
        sortKey={serverSort ? sortKey : undefined}
        sortDir={serverSort ? sortDir : undefined}
        onSortChange={serverSort ? onSortChange : undefined}
        serverSort={serverSort}
        selectable={false}
        density={density}
        stickyHeader={stickyHeader}
      />
      <PaginationBar
        page={page}
        limit={limit}
        total={total}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        pageSizeOptions={pageSizeOptions}
        testId={`${testId}-pager`}
      />
    </CrmTableCard>
  );
}
