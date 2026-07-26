import React from "react";
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrmButton } from "@/components/ui/crm-button";
import { CrmSelect } from "@/components/ui/crm-field";

const DEFAULT_SIZES = [25, 50, 100, 200];

/**
 * Compact pagination footer for CRM list pages.
 */
export function PaginationBar({
  page = 1,
  limit = 25,
  total = 0,
  onPageChange,
  onLimitChange,
  pageSizeOptions = DEFAULT_SIZES,
  className,
  testId = "pagination-bar",
}) {
  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border bg-surface-card text-xs text-ink-muted",
        className,
      )}
      data-testid={testId}
    >
      <div className="font-mono">
        Showing <span className="text-ink">{start}</span>–<span className="text-ink">{end}</span> of{" "}
        <span className="text-ink">{total}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest">Rows</span>
          <CrmSelect
            value={String(limit)}
            onChange={(e) => onLimitChange?.(Number(e.target.value))}
            className="w-[4.5rem]"
            data-testid={`${testId}-limit`}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </CrmSelect>
        </div>

        <span className="font-mono text-[11px] px-1">
          Page {page} / {pages}
        </span>

        <div className="flex items-center gap-0.5">
          <CrmButton type="button" variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange?.(1)} title="First">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </CrmButton>
          <CrmButton type="button" variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} title="Previous" data-testid={`${testId}-prev`}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </CrmButton>
          <CrmButton type="button" variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange?.(page + 1)} title="Next" data-testid={`${testId}-next`}>
            <ChevronRight className="w-3.5 h-3.5" />
          </CrmButton>
          <CrmButton type="button" variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange?.(pages)} title="Last">
            <ChevronsRight className="w-3.5 h-3.5" />
          </CrmButton>
        </div>
      </div>
    </div>
  );
}
