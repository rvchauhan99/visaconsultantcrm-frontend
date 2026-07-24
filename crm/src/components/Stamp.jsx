import React from "react";
import { cn } from "@/lib/utils";

const tones = {
  gold: "text-gold border-gold",
  ink: "text-ink border-ink",
  teal: "text-teal border-teal",
  navy: "text-navy border-navy",
  success: "text-success border-success",
  warning: "text-warning border-warning",
  danger: "text-danger border-danger",
  muted: "text-ink-muted border-ink-muted opacity-70",
};

const sizes = {
  sm: "px-2 py-0.5 text-[0.6rem] tracking-[0.14em]",
  md: "px-3 py-1 text-[0.65rem] tracking-[0.15em]",
};

export default function Stamp({ tone = "ink", size = "sm", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1",
        "font-sans font-semibold uppercase whitespace-nowrap leading-none",
        "border-[1.5px] border-double rounded-full",
        sizes[size] ?? sizes.sm,
        tones[tone] ?? tones.ink,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
