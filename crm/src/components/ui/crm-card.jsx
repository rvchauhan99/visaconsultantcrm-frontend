import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ═══════════════════════════════════
   CrmCard — base card
═══════════════════════════════════ */
export function CrmCard({ className, children, hover = false, ...props }) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-border rounded-[10px] shadow-[var(--shadow-card)]",
        hover && "transition-all duration-200 hover:shadow-[var(--shadow-premium)] hover:-translate-y-px cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════
   CrmStatCard — KPI card with trend
═══════════════════════════════════ */
export function CrmStatCard({ label, value, trend, delta, tone, icon: Icon, className }) {
  const toneColor = {
    danger:  "text-danger",
    warning: "text-warning",
    success: "text-success",
    default: "text-ink",
  }[tone] ?? "text-ink";

  const trendEl = trend === "up"   ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                : trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-danger" />
                : trend === "flat" ? <Minus className="w-3.5 h-3.5 text-ink-muted" />
                : null;

  return (
    <div className={cn("bg-surface-card border border-border rounded-[10px] p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted leading-none">{label}</div>
        {Icon && (
          <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center text-ink-muted shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className={cn("font-mono text-2xl font-semibold leading-none", toneColor)}>{value ?? "—"}</div>
      {(trendEl || delta) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trendEl}
          {delta && <span className="text-[11px] text-ink-muted">{delta}</span>}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   CrmTableCard — card wrapping a table
═══════════════════════════════════ */
export function CrmTableCard({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-border rounded-[10px] shadow-[var(--shadow-card)] overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════
   CrmCardHeader — consistent header inside a card
═══════════════════════════════════ */
export function CrmCardHeader({ label, title, actions, className }) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3 border-b border-border", className)}>
      <div>
        {label && <div className="text-[10px] uppercase font-mono tracking-widest text-ink-muted mb-0.5">{label}</div>}
        {title && <div className="text-sm font-semibold text-ink">{title}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ═══════════════════════════════════
   CrmSkeleton — shimmer loading
═══════════════════════════════════ */
export function CrmSkeleton({ className }) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-border",
        "bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted",
        "bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]",
        className,
      )}
    />
  );
}

/* ═══════════════════════════════════
   CrmEmptyState
═══════════════════════════════════ */
export function CrmEmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("text-center py-12 px-6 text-ink-muted", className)}>
      {Icon && (
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface-muted border border-border mx-auto mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      {description && <p className="text-xs text-ink-muted mb-4 max-w-xs mx-auto">{description}</p>}
      {action}
    </div>
  );
}
