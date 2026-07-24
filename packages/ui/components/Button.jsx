import React from "react";
import { cva } from "class-variance-authority";

function cn(...a) {
  return a.flat().filter(Boolean).join(" ");
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  {
    variants: {
      variant: {
        primary: "bg-navy text-white hover:bg-navy-hover shadow-sm",
        secondary: "border border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-white",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
        teal: "border border-teal text-teal hover:bg-teal hover:text-white",
        danger: "border border-danger text-danger hover:bg-danger hover:text-white",
        brass: "border border-gold text-gold hover:bg-gold hover:text-white",
        link: "rounded-none text-teal underline-offset-4 hover:underline px-0 py-0",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-7 py-3 text-base",
        icon: "p-2",
      },
      density: {
        comfortable: "rounded-full",
        compact: "rounded-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md", density: "comfortable" },
  },
);

export function Button({ className, variant, size, density = "comfortable", asChild, children, ...props }) {
  const classes = cn(buttonVariants({ variant, size, density }), className);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(classes, children.props.className),
      ...props,
    });
  }
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export { buttonVariants };
