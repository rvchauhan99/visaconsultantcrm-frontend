import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-surface-muted via-surface-card to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]",
        className
      )}
      {...props} />
  );
}

export { Skeleton }
