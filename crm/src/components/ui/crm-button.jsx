import React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "font-sans font-semibold text-[0.8125rem] rounded-lg",
    "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2",
    "select-none whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        solid:   "bg-[linear-gradient(135deg,var(--navy)_0%,var(--teal)_100%)] text-white hover:shadow-[0_0_0_1px_rgba(31,74,58,0.3),0_6px_20px_rgba(31,74,58,0.25)] hover:-translate-y-px active:translate-y-0 active:shadow-sm shadow-sm",
        outline: "border border-border text-ink bg-surface-card hover:border-navy/40 hover:text-navy hover:bg-surface-hover shadow-sm hover:shadow-md",
        ghost:   "text-ink-muted bg-transparent hover:text-ink hover:bg-surface-muted",
        danger:  "border border-danger/60 text-danger bg-surface-card hover:bg-danger hover:text-white hover:border-danger hover:shadow-md",
        success: "border border-success/60 text-success bg-surface-card hover:bg-success hover:text-white hover:border-success hover:shadow-md",
        teal:    "border border-teal/60 text-teal bg-surface-card hover:bg-teal hover:text-white hover:border-teal hover:shadow-md",
        link:    "text-teal hover:underline underline-offset-2 p-0 h-auto rounded-none",
      },
      size: {
        xs:   "px-2.5 py-1 text-[0.7rem] h-7",
        sm:   "px-3 py-1.5 text-xs h-8",
        md:   "px-4 py-2 h-9",
        icon: "p-1.5 h-8 w-8",
        "icon-sm": "p-1 h-7 w-7",
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
