import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { height: 28, width: 74 },
  md: { height: 36, width: 95 },
  lg: { height: 48, width: 126 },
  xl: { height: 56, width: 147 },
};

/**
 * AmaraVisa brand wordmark from /public/brand PNG assets.
 */
export default function AmaraVisaLogo({
  size = "md",
  invert = false,
  className,
  priority = false,
}) {
  const dims = SIZES[size] || SIZES.md;
  const src = invert ? "/brand/amaravisa-logo-light.png" : "/brand/amaravisa-logo.png";

  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <Image
        src={src}
        alt="amaravisa"
        width={dims.width}
        height={dims.height}
        priority={priority}
        className="h-full w-auto object-contain object-left"
        style={{ height: dims.height, width: "auto" }}
      />
    </span>
  );
}
