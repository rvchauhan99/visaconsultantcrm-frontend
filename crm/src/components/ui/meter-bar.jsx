import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Thin progress / share meter used in funnels and completeness bars.
 */
export function MeterBar({
  value = 0,
  max = 100,
  className,
  barClassName,
  tone = "navy",
  height = "h-1.5",
  showLabel = false,
  label,
}) {
  const pct = max > 0 ? Math.min(100, Math.round((Number(value) / Number(max)) * 100)) : 0;
  const toneClass = {
    navy: "bg-gradient-to-r from-navy to-teal",
    teal: "bg-teal",
    gold: "bg-gold",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    muted: "bg-ink-muted/40",
  }[tone] || "bg-navy";

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-[10px] text-ink-muted mb-0.5">
          <span>{label}</span>
          <span className="font-mono">{pct}%</span>
        </div>
      )}
      <div className={cn("rounded-full bg-surface-muted overflow-hidden", height)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", toneClass, barClassName)}
        />
      </div>
    </div>
  );
}

/**
 * Label + amount + share-of-max bar (payments / breakdown lists).
 */
export function BreakdownRow({
  label,
  value,
  max,
  formatValue,
  color = "bg-navy",
  className,
}) {
  const amount = Number(value) || 0;
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-ink truncate">{label}</span>
        <span className="font-mono text-ink-muted shrink-0">
          {formatValue ? formatValue(amount) : amount}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-muted overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
