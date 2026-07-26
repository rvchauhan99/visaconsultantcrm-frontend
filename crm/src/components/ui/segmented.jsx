import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Pill segmented control with optional per-segment counts.
 * Uses framer-motion for a premium sliding background animation.
 *
 * segments: [{ value, label, count? }]
 */
export function Segmented({
  segments = [],
  value,
  onChange,
  className,
  size = "sm",
  testId = "segmented",
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-surface-muted/50 border border-border backdrop-blur-sm",
        className,
      )}
      data-testid={testId}
      role="tablist"
    >
      {segments.map((seg) => {
        const active = value === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(seg.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/50",
              size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs",
              active ? "text-white" : "text-ink-muted hover:text-ink hover:bg-surface-card/50",
            )}
            data-testid={`${testId}-${seg.value}`}
          >
            {active && (
              <motion.div
                layoutId={`${testId}-active-pill`}
                className="absolute inset-0 bg-navy rounded-full shadow-[0_2px_8px_rgba(15,40,32,0.25)]"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{seg.label}</span>
            {seg.count != null && (
              <span className={cn(
                "relative z-10 font-mono text-[10px] px-1.5 py-0.5 leading-none rounded-full min-w-[1.25rem] text-center transition-colors",
                active ? "bg-white/20 text-white" : "bg-surface-card text-ink-muted border border-border/50",
              )}>
                {seg.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
