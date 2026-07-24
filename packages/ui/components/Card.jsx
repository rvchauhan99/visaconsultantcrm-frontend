import React from "react";
import { cva } from "class-variance-authority";

function cn(...a) {
  return a.flat().filter(Boolean).join(" ");
}

const cardVariants = cva("bg-surface-card border border-border text-ink", {
  variants: {
    density: {
      comfortable: "rounded-2xl shadow-[var(--shadow-card)]",
      compact: "rounded-sm shadow-none",
    },
    elevated: {
      true: "shadow-[var(--shadow-premium)]",
      false: "",
    },
    interactive: {
      true: "transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]",
      false: "",
    },
  },
  defaultVariants: { density: "comfortable", elevated: false, interactive: false },
});

export function Card({ className, density = "comfortable", elevated, interactive, children, ...props }) {
  return (
    <div className={cn(cardVariants({ density, elevated, interactive }), className)} {...props}>
      {children}
    </div>
  );
}

export function Surface({ className, children, ...props }) {
  return (
    <div className={cn("bg-surface-muted/60 border border-border rounded-xl", className)} {...props}>
      {children}
    </div>
  );
}
