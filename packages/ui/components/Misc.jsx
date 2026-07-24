import React from "react";
import Seal from "../Stamp.jsx";

function cn(...a) {
  return a.flat().filter(Boolean).join(" ");
}

export function Badge({ children, tone = "ink", size = "sm", className, ...props }) {
  return (
    <Seal tone={tone} size={size} className={className} {...props}>
      {children}
    </Seal>
  );
}

export function Stat({ label, value, hint, icon, density = "comfortable", className }) {
  return (
    <div className={cn(density === "compact" ? "p-3 rounded-sm border border-border bg-surface-card" : "p-5 rounded-2xl border border-border bg-surface-card shadow-[var(--shadow-card)]", className)}>
      <div className={cn("flex items-center gap-1.5 text-ink-muted uppercase tracking-widest font-mono mb-1", density === "compact" ? "text-[9px]" : "text-[10px]")}>
        {icon}
        {label}
      </div>
      <div className={cn("text-navy", density === "compact" ? "text-lg font-semibold font-sans" : "font-display text-2xl")}>{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 mb-6", className)}>
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-teal font-medium mb-2">{eyebrow}</p>}
        <h2 className="font-display text-2xl md:text-3xl text-navy tracking-tight">{title}</h2>
        {description && <p className="text-ink-muted mt-2 max-w-xl leading-relaxed">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, density = "comfortable", className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", density === "compact" ? "mb-3" : "mb-8", className)}>
      <div>
        <h1 className={cn("text-navy tracking-tight", density === "compact" ? "text-lg font-semibold font-sans" : "font-display text-3xl md:text-4xl")}>{title}</h1>
        {description && <p className={cn("text-ink-muted", density === "compact" ? "text-xs mt-0.5" : "text-sm mt-2")}>{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toolbar({ children, className }) {
  return <div className={cn("flex flex-wrap items-center gap-2 mb-3", className)}>{children}</div>;
}

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]",
        className,
      )}
      aria-hidden
    />
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("text-center py-16 border border-dashed border-border rounded-2xl bg-surface-card", className)}>
      {Icon && <Icon className="w-8 h-8 mx-auto text-ink-muted mb-3" />}
      <p className="font-display text-xl text-navy mb-1">{title}</p>
      {description && <p className="text-sm text-ink-muted mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, className }) {
  return (
    <div className={cn("text-center py-16 border border-dashed border-danger/30 rounded-2xl bg-surface-card", className)} role="alert">
      <p className="font-display text-xl text-navy mb-1">{title}</p>
      {description && <p className="text-sm text-ink-muted mb-6">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm px-5 py-2.5 rounded-full bg-navy text-white hover:bg-navy-hover">
          Try again
        </button>
      )}
    </div>
  );
}

export function DataTable({ columns = [], rows = [], keyField = "id", empty, className, onRowClick }) {
  if (!rows.length && empty) return empty;
  return (
    <div className={cn("overflow-x-auto border border-border rounded-sm bg-surface-card", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/50">
            {columns.map((c) => (
              <th key={c.key} className="text-left px-2 py-1.5 text-[10px] uppercase font-mono tracking-widest text-ink-muted font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              className={cn("border-b border-border last:border-0", onRowClick && "cursor-pointer hover:bg-surface-muted/40")}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-1.5 align-middle">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
