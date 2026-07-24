import React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "font-sans font-medium text-xs rounded-md",
    "transition-all duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1",
    "select-none whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        solid:   "bg-navy text-white hover:bg-navy-hover shadow-sm hover:shadow-glow-navy hover:-translate-y-px active:translate-y-0",
        outline: "border border-border text-ink bg-surface-card hover:border-navy hover:text-navy hover:bg-surface-muted/50 shadow-sm",
        ghost:   "text-ink-muted bg-transparent hover:text-ink hover:bg-surface-muted",
        danger:  "border border-danger text-danger hover:bg-danger hover:text-white",
        success: "border border-success text-success hover:bg-success hover:text-white",
        teal:    "border border-teal text-teal hover:bg-teal hover:text-white",
        link:    "text-teal hover:underline underline-offset-2 p-0 h-auto rounded-none",
      },
      size: {
        xs:   "px-2 py-1 text-[0.7rem] h-6",
        sm:   "px-2.5 py-1.5 text-xs h-7",
        md:   "px-3.5 py-2 h-8",
        icon: "p-1.5 h-7 w-7",
        "icon-sm": "p-1 h-6 w-6",
      },
    },
    defaultVariants: { variant: "solid", size: "sm" },
  },
);

export function CrmButton({ className, variant, size, asChild = false, loading = false, children, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </Comp>
  );
}

export { buttonVariants };
