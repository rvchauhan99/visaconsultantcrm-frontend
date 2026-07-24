import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium font-sans text-sm rounded-full",
    "transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* ── Primary gradient CTA ── */
        primary: [
          "bg-gradient-to-r from-navy via-teal to-navy bg-[length:200%_100%] text-white",
          "shadow-[0_4px_16px_var(--glow-navy),inset_0_1px_0_rgba(255,252,247,0.08)]",
          "hover:bg-right hover:shadow-[0_8px_28px_var(--glow-navy)]",
          "hover:-translate-y-px active:translate-y-0",
        ].join(" "),

        /* ── Solid navy ── */
        solid: [
          "bg-navy text-white",
          "shadow-[0_2px_8px_var(--glow-navy)]",
          "hover:bg-navy-hover hover:shadow-[0_6px_20px_var(--glow-navy)] hover:-translate-y-px",
          "active:translate-y-0",
        ].join(" "),

        /* ── Secondary outlined ── */
        secondary: [
          "border border-border-strong bg-surface-card text-ink",
          "hover:border-navy hover:text-navy hover:bg-[rgba(31,74,58,0.04)]",
          "hover:-translate-y-px",
          "shadow-[var(--shadow-xs)]",
        ].join(" "),

        /* ── Ghost ── */
        ghost: [
          "text-ink-muted bg-transparent",
          "hover:text-ink hover:bg-surface-muted",
        ].join(" "),

        /* ── Glass morphism ── */
        glass: [
          "bg-[var(--glass)] backdrop-blur-xl text-ink border border-[var(--glass-border)]",
          "hover:bg-surface-card hover:border-border-strong",
          "shadow-[var(--shadow-xs)]",
        ].join(" "),

        /* ── Teal outlined ── */
        teal: [
          "border border-teal text-teal bg-transparent",
          "hover:bg-teal hover:text-white hover:-translate-y-px",
          "shadow-[0_0_0_0_var(--glow-teal)] hover:shadow-[0_4px_12px_var(--glow-teal)]",
        ].join(" "),

        /* ── Danger ── */
        danger: "border border-danger text-danger hover:bg-danger hover:text-white",

        /* ── Link ── */
        link: "rounded-none text-teal underline-offset-2 hover:underline px-0 py-0 h-auto",

        /* ── Gold foil CTA ── */
        gold: [
          "bg-gradient-to-r from-gold via-gold-light to-gold bg-[length:200%_100%] text-white",
          "shadow-[0_4px_16px_var(--glow-gold)]",
          "hover:bg-right hover:shadow-[0_8px_28px_var(--glow-gold)] hover:-translate-y-px",
        ].join(" "),
      },
      size: {
        xs: "px-3 py-1.5 text-xs h-7",
        sm: "px-4 py-2 text-xs h-8",
        md: "px-5 py-2.5 h-10",
        lg: "px-7 py-3.5 text-base h-12",
        xl: "px-9 py-4 text-lg h-14",
        icon: "p-2 h-9 w-9",
        "icon-sm": "p-1.5 h-7 w-7",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </Comp>
  );
}

export { buttonVariants };
