import { cn } from "@/lib/utils";

const SIZES = {
  sm: {
    container: "h-7",
    icon: "w-7 h-7 min-w-[28px]",
    text: "text-lg",
  },
  md: {
    container: "h-9",
    icon: "w-9 h-9 min-w-[36px]",
    text: "text-2xl",
  },
  lg: {
    container: "h-11",
    icon: "w-11 h-11 min-w-[44px]",
    text: "text-3xl",
  },
};

/**
 * Enhanced AmaraVisa wordmark and monogram.
 * Replaces the legacy PNG with a crisp SVG + Typography component.
 */
export default function AmaraVisaLogo({
  size = "md",
  invert = false,
  className,
  priority = false,
}) {
  const isDark = invert;
  const sizeClasses = SIZES[size] || SIZES.md;

  return (
    <div className={cn("flex items-center gap-2.5 font-serif select-none", sizeClasses.container, className)}>
      {/* Brand Icon (Monogram) */}
      <div className={cn(
        "shrink-0 flex items-center justify-center rounded-lg shadow-sm overflow-hidden relative",
        sizeClasses.icon,
        isDark 
          ? "bg-gradient-to-br from-[#FFFDF9] to-[#F5F2EA] border border-[#FFFDF9]/20" 
          : "bg-gradient-to-br from-[#123026] to-[#0f2820] border border-[#123026]/20"
      )}>
        {/* Subtle gold flare */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#CFA96F]/30 rounded-full blur-md pointer-events-none" />
        
        {/* The 'A' Monogram */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={cn("w-3/5 h-3/5 drop-shadow-sm z-10", isDark ? "text-[#0f2820]" : "text-[#FFFDF9]")}
        >
          <path d="M12 3L4 21" />
          <path d="M12 3L20 21" />
          <path d="M8 15H16" stroke="#CFA96F" />
        </svg>
      </div>
      
      {/* Brand Text */}
      <div className={cn(
        "flex items-baseline whitespace-nowrap tracking-tight",
        sizeClasses.text,
        isDark ? "text-[#FFFDF9]" : "text-[#1c1410]"
      )}>
        <span className="font-medium">Amara</span>
        <span className="italic font-light text-[#CFA96F] ml-[2px]">Visa</span>
      </div>
    </div>
  );
}
