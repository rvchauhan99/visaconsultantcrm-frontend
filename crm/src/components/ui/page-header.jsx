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
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {label && (
          <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-ink-muted mb-1.5">{label}</div>
        )}
        <h1 className="text-xl font-bold text-ink leading-tight tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-0.5">{actions}</div>
      )}
    </div>
  );
}

/**
 * SectionLabel — mono uppercase section divider label
 */
export function SectionLabel({ children, className }) {
  return (
    <div className={cn("text-[10px] uppercase font-mono tracking-[0.18em] text-ink-muted mb-2.5", className)}>
      {children}
    </div>
  );
}
