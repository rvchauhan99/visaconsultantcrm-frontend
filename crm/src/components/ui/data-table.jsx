import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { CrmEmptyState } from "@/components/ui/crm-card";

/**
 * DataTable — reusable sortable table for CRM pages.
 *
 * Optional controlled sort: pass sortKey/sortDir/onSortChange (and serverSort)
 * to opt into server-driven sorting. Existing callers keep client-side sort.
 */
export function DataTable({
  columns,
  data = [],
  loading = false,
  empty,
  onRowClick,
  rowTestId,
  className,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  serverSort = false,
  density = "comfortable",
  stickyHeader = false,
}) {
  const [internalKey, setInternalKey] = useState(null);
  const [internalDir, setInternalDir] = useState("asc");

  const isControlled = controlledSortKey !== undefined || !!onSortChange;
  const sortKey = isControlled ? (controlledSortKey ?? null) : internalKey;
  const sortDir = isControlled ? (controlledSortDir || "asc") : internalDir;

  const toggleSort = (key) => {
    if (!key) return;
    let nextDir = "asc";
    if (sortKey === key) nextDir = sortDir === "asc" ? "desc" : "asc";
    if (onSortChange) {
      onSortChange(key, nextDir);
      return;
    }
    if (sortKey === key) setInternalDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setInternalKey(key);
      setInternalDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (serverSort || !sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, serverSort]);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-navy" />
      : <ChevronDown className="w-3 h-3 text-navy" />;
  };

  const cellPad = density === "compact" ? "py-2 px-3" : "";

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("data-table w-full border-collapse", density === "compact" && "text-[0.8rem]")}>
        <thead className={stickyHeader ? "sticky top-0 z-10 bg-surface-card" : undefined}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  col.sortable !== false && "cursor-pointer select-none hover:text-ink",
                  cellPad,
                  col.headerClassName,
                )}
                onClick={() => col.sortable !== false && toggleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable !== false && <SortIcon colKey={col.key} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className={cellPad}>
                    <div className="h-4 rounded-lg bg-surface-muted animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%]" />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {empty ? (
                  <CrmEmptyState
                    icon={empty.icon}
                    title={empty.title}
                    description={empty.description}
                    action={empty.action}
                  />
                ) : (
                  <div className="py-10 text-center text-sm text-ink-muted italic">No data</div>
                )}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={onRowClick ? "clickable" : ""}
                onClick={() => onRowClick?.(row)}
                data-testid={rowTestId?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn(cellPad, col.className)}>
                    {col.render ? col.render(row, row[col.key]) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
