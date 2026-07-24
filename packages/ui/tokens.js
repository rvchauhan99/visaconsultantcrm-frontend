/**
 * Passage — Editorial Luxe design tokens
 * Shared by customer (spacious) and CRM (dense).
 * Token NAMES stay stable so Tailwind utilities (text-navy, bg-gold, …) keep working;
 * VALUES are the new Editorial Luxe palette.
 */
module.exports = {
  colors: {
    // Surfaces & text
    ink: "#1C1410",
    "ink-muted": "#6B5E52",
    surface: "#F7F3EB",
    "surface-card": "#FFFCF7",
    "surface-elevated": "#FFFFFF",
    "surface-muted": "#EFE8DC",

    // Brand (mapped to legacy names for compatibility)
    navy: "#1F4A3A", // bottle green — primary
    "navy-hover": "#16382C",
    teal: "#2F6B5A", // forest accent
    gold: "#B08D57", // brass foil — seal only

    // Semantic (warm-tuned)
    success: "#3D6B4F",
    warning: "#A67C2D",
    danger: "#9B3D32",
    border: "#E4D9C8",
    "border-strong": "#C9BBA5",

    // Aliases used by shadcn-style components
    primary: "#1F4A3A",
    "primary-foreground": "#FFFCF7",
    accent: "#2F6B5A",
    ring: "#1F4A3A",
  },

  fontFamily: {
    display: ['"Newsreader"', '"Fraunces"', "Georgia", "serif"],
    sans: ['"Plus Jakarta Sans"', '"IBM Plex Sans"', "system-ui", "sans-serif"],
    mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
  },

  borderRadius: {
    comfortable: "16px",
    compact: "6px",
    DEFAULT: "12px",
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "20px",
    full: "9999px",
  },

  boxShadow: {
    card: "0 1px 2px rgba(28, 20, 16, 0.04), 0 4px 12px rgba(28, 20, 16, 0.04)",
    premium: "0 12px 40px rgba(28, 20, 16, 0.08), 0 2px 8px rgba(28, 20, 16, 0.04)",
    stamp: "inset 0 0 0 1px currentColor",
    lift: "0 16px 48px rgba(28, 20, 16, 0.12)",
  },

  spacing: {
    base: 8,
  },

  motion: {
    duration: {
      fast: 150,
      base: 280,
      slow: 420,
    },
    ease: {
      out: [0.16, 1, 0.3, 1],
      inOut: [0.65, 0, 0.35, 1],
    },
  },

  keyframes: {
    "stamp-in": {
      "0%": { transform: "scale(1.35) rotate(-5deg)", opacity: "0" },
      "55%": { transform: "scale(0.98) rotate(-1.5deg)", opacity: "0.95" },
      "100%": { transform: "scale(1) rotate(-1.5deg)", opacity: "1" },
    },
    "fade-up": {
      "0%": { transform: "translateY(12px)", opacity: "0" },
      "100%": { transform: "translateY(0)", opacity: "1" },
    },
    shimmer: {
      "0%": { backgroundPosition: "-200% 0" },
      "100%": { backgroundPosition: "200% 0" },
    },
  },

  animation: {
    "stamp-in": "stamp-in 480ms cubic-bezier(0.16, 1, 0.3, 1)",
    "fade-up": "fade-up 420ms cubic-bezier(0.16, 1, 0.3, 1)",
    shimmer: "shimmer 1.6s linear infinite",
  },
};
