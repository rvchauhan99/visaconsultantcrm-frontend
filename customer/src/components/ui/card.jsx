import { cn } from "@/lib/utils";

/* ════════════════════════════════════
   Card — 4 visual variants
════════════════════════════════════ */

const cardVariants = {
  default: "bg-surface-card border border-border rounded-[20px] shadow-[var(--shadow-card)]",
  premium: [
    "bg-gradient-to-br from-surface-card to-surface-warm",
    "border border-border rounded-[20px]",
    "shadow-[var(--shadow-premium)]",
    "transition-[transform,box-shadow] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
  ].join(" "),
  glass: [
    "bg-white/70 backdrop-blur-xl",
    "border border-white/80 rounded-[20px]",
    "shadow-[0_8px_28px_rgba(28,20,16,0.05)]",
  ].join(" "),
  elevated: [
    "bg-surface-elevated border border-border rounded-[20px]",
    "shadow-[var(--shadow-lift)]",
  ].join(" "),
  flat: "bg-surface-muted border border-border/60 rounded-[16px]",
};

export function Card({ className, variant = "default", children, ...props }) {
  return (
    <div className={cn(cardVariants[variant] ?? cardVariants.default, className)} {...props}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════
   Skeleton — shimmer loading state
════════════════════════════════════ */

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border overflow-hidden relative",
        "bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted",
        "bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]",
        className,
      )}
    >
      {/* Inner shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.6s_linear_infinite] pointer-events-none" />
    </div>
  );
}

/* ════════════════════════════════════
   EmptyState
════════════════════════════════════ */

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "text-center py-20 border border-dashed border-border rounded-[20px]",
        "bg-gradient-to-br from-surface-card to-surface-muted/50",
        "relative overflow-hidden",
        className,
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(31,74,58,0.04),transparent)] pointer-events-none" />

      <div className="relative z-10">
        {Icon && (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-muted border border-border mx-auto mb-4">
            <Icon className="w-6 h-6 text-ink-muted" />
          </div>
        )}
        <p className="font-display text-2xl text-navy mb-2">{title}</p>
        {description && (
          <p className="text-sm text-ink-muted mb-8 max-w-sm mx-auto leading-relaxed">{description}</p>
        )}
        {action}
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   ErrorState
════════════════════════════════════ */

export function ErrorState({ title = "Something went wrong", description, onRetry, className }) {
  return (
    <div
      className={cn(
        "text-center py-16 border border-dashed border-danger/25 rounded-[20px]",
        "bg-gradient-to-br from-surface-card to-surface-muted/50",
        className,
      )}
      role="alert"
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/8 border border-danger/20 mx-auto mb-4">
        <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="font-display text-xl text-navy mb-2">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted mb-6">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm px-6 py-2.5 rounded-full bg-navy text-white hover:bg-navy-hover transition-colors shadow-[var(--shadow-card)]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════
   Divider
════════════════════════════════════ */

export function Divider({ className, label }) {
  if (label) {
    return (
      <div className={cn("relative flex items-center gap-4", className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }
  return <div className={cn("h-px bg-border", className)} />;
}
