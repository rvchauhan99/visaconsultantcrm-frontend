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
        "bg-gradient-to-br from-surface-card to-surface-warm border border-border rounded-[14px] shadow-[var(--shadow-card)]",
        hover && "transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[var(--shadow-premium)] hover:-translate-y-[2px] hover:border-[var(--border-glow)] cursor-pointer",
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

  const toneBg = {
    danger:  "bg-[var(--gradient-stat-danger)]",
    warning: "bg-[var(--gradient-stat-warning)]",
    success: "bg-[var(--gradient-stat-success)]",
  }[tone] ?? "";

  const trendEl = trend === "up"   ? <TrendingUp className="w-3.5 h-3.5 text-success" />
                : trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-danger" />
                : trend === "flat" ? <Minus className="w-3.5 h-3.5 text-ink-muted" />
                : null;

  return (
    <div className={cn(
      "bg-gradient-to-br from-surface-card to-surface-warm border border-border rounded-[14px] p-3 shadow-[var(--shadow-card)]",
      "transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "hover:shadow-[var(--shadow-premium)] hover:-translate-y-px",
      toneBg,
      className,
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] uppercase font-mono tracking-[0.14em] text-ink-muted leading-none">{label}</div>
          <div className={cn("font-sans text-2xl font-bold leading-none tracking-tight", toneColor)}>{value ?? "—"}</div>
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-[10px] bg-surface-muted/80 border border-border/50 flex items-center justify-center text-ink-muted shrink-0 shadow-[var(--shadow-xs)]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {(trendEl || delta) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trendEl}
          {delta && <span className="text-[10px] text-ink-muted">{delta}</span>}
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
        "bg-gradient-to-br from-surface-card to-surface-warm border border-border rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden",
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
    <div className={cn("flex items-center justify-between px-5 py-3.5 border-b border-border", className)}>
      <div>
        {label && <div className="text-[10px] uppercase font-mono tracking-[0.14em] text-ink-muted mb-0.5">{label}</div>}
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
        "rounded-[14px] border border-border",
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
    <div className={cn("text-center py-14 px-6 text-ink-muted", className)}>
      {Icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-muted border border-border/60 mx-auto mb-4 shadow-[var(--shadow-xs)]">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink mb-1">{title}</p>
      {description && <p className="text-xs text-ink-muted mb-5 max-w-xs mx-auto leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
