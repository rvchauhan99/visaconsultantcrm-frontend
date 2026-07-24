import React from "react";

function cn(...a) {
  return a.flat().filter(Boolean).join(" ");
}

const inputBase =
  "w-full border border-border bg-surface-elevated text-ink outline-none transition-shadow placeholder:text-ink-muted/70 focus:ring-2 focus:ring-navy focus:border-navy";

export function Input({ className, density = "comfortable", ...props }) {
  return (
    <input
      className={cn(
        inputBase,
        density === "compact" ? "h-8 px-2 text-sm rounded-sm" : "h-11 px-3.5 text-sm rounded-lg",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, density = "comfortable", children, ...props }) {
  return (
    <select
      className={cn(
        inputBase,
        density === "compact" ? "h-8 px-2 text-sm rounded-sm" : "h-11 px-3.5 text-sm rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, required, hint, error, children, className, density = "comfortable" }) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className={cn("text-ink-muted block", density === "compact" ? "text-[10px] mb-1 uppercase tracking-wider font-mono" : "text-xs mb-1.5")}>
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? <p className="text-xs text-danger mt-1">{error}</p> : hint ? <p className="text-xs text-ink-muted mt-1">{hint}</p> : null}
    </label>
  );
}
