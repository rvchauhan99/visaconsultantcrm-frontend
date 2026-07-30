import { cn } from "@/lib/utils";

const SIZES = {
  sm: { height: 28 },
  md: { height: 36 },
  lg: { height: 44 },
};

/**
 * AmaraVisa brand wordmark from /public/brand PNG assets.
 */
export default function AmaraVisaLogo({
  size = "md",
  invert = false,
  className,
}) {
  const dims = SIZES[size] || SIZES.md;
  const src = invert
    ? `${process.env.PUBLIC_URL || ""}/brand/amaravisa-logo-light.png`
    : `${process.env.PUBLIC_URL || ""}/brand/amaravisa-logo.png`;

  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <img
        src={src}
        alt="amaravisa"
        height={dims.height}
        className="w-auto object-contain object-left"
        style={{ height: dims.height, width: "auto" }}
      />
    </span>
  );
}
