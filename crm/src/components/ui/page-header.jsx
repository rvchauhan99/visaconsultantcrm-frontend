import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader — consistent header for all CRM pages.
 *
 * Props:
 *   label:     string — mono uppercase eyebrow (e.g. "Cases")
 *   title:     string — main page heading
 *   subtitle?: string — optional small description
 *   actions?:  ReactNode — right-side buttons/controls
 *   className?: string
 */
export function PageHeader({ label, title, subtitle, actions, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-5", className)}>
      <div className="min-w-0">
        {label && (
          <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-1">{label}</div>
        )}
        <h1 className="text-lg font-semibold text-ink leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">{actions}</div>
      )}
    </div>
  );
}

/**
 * SectionLabel — mono uppercase section divider label
 */
export function SectionLabel({ children, className }) {
  return (
    <div className={cn("text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-2", className)}>
      {children}
    </div>
  );
}
