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
  sm: "px-3 py-1 text-[0.6rem] tracking-[0.15em]",
  md: "px-4 py-1.5 text-[0.68rem] tracking-[0.16em]",
  lg: "px-5 py-2 text-[0.78rem] tracking-[0.18em]",
};

export default function Stamp({ tone = "ink", size = "sm", className, children }) {
  const isGold = tone === "gold";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5",
        "font-sans font-semibold uppercase whitespace-nowrap leading-none",
        "border-2 border-double rounded-full",
        sizes[size],
        tones[tone],
        isGold && "motion-safe:animate-shimmer-gold",
        className,
      )}
    >
      {children}
    </span>
  );
}
