import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { CrmEmptyState, CrmSkeleton } from "@/components/ui/crm-card";

/**
 * DataTable — reusable sortable table for CRM pages.
 *
 * Props:
 *   columns: Array<{ key, label, sortable?, render?(row, value), className?, headerClassName? }>
 *   data:    Array of row objects
 *   loading: boolean — shows skeleton rows
 *   empty:   { icon?, title, description?, action? } — empty state config
 *   onRowClick?: (row) => void
 *   rowTestId?:  (row) => string
 *   className?:  string
 */
export function DataTable({
  columns,
  data = [],
  loading = false,
  empty,
  onRowClick,
  rowTestId,
  className,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-navy" />
      : <ChevronDown className="w-3 h-3 text-navy" />;
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="data-table w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  col.sortable !== false && "cursor-pointer select-none hover:text-ink",
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
                  <td key={col.key}>
                    <div className="h-4 rounded bg-surface-muted animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%]" />
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
                  <div className="py-8 text-center text-xs text-ink-muted italic">No data</div>
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
                  <td key={col.key} className={col.className}>
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
