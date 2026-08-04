import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * CrmField — label + input wrapper for CRM density.
 * No floating labels (not enough vertical space in compact forms).
 */
export function CrmField({ label, hint, error, required, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-xs font-semibold text-ink-muted leading-none">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-danger font-medium">{error}</p>}
      {hint && !error && <p className="text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

/**
 * CrmInput — compact styled input (h-9, rounded-lg, focus glow)
 */
export const CrmInput = forwardRef(function CrmInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("crm-input", className)}
      {...props}
    />
  );
});

/**
 * CrmSelect — compact styled select
 */
export const CrmSelect = forwardRef(function CrmSelect({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "crm-input appearance-none cursor-pointer pr-8 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b5e52' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.625rem_center]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/**
 * CrmTextarea — compact styled textarea
 */
export const CrmTextarea = forwardRef(function CrmTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3 py-2.5 border border-border rounded-lg bg-surface-card",
        "font-sans text-[0.8125rem] text-ink placeholder:text-ink-subtle",
        "outline-none resize-none transition-all duration-200",
        "hover:border-border-strong focus:border-navy focus:ring-2 focus:ring-navy/15",
        className,
      )}
      {...props}
    />
  );
});
