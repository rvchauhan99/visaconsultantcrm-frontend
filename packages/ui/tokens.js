/**
 * AmaraVisa · Editorial Luxe design tokens v2 (Premium Glass)
 * Shared by customer (spacious) and CRM (dense).
 * Token NAMES stay stable so Tailwind utilities (text-navy, bg-gold, …) keep working;
 * VALUES are the Editorial Luxe palette plus AmaraVisa brand accents.
 */
module.exports = {
  colors: {
    // Surfaces & text
    ink: "#1C1410",
    "ink-muted": "#6B5E52",
    surface: "#FAF9F7",
    "surface-card": "#FFFFFF",
    "surface-elevated": "#FFFFFF",
    "surface-muted": "#F3F2EF",
    "surface-warm": "#FAF8F5",

    // Brand (mapped to legacy names for compatibility)
    navy: "#1F4A3A", // bottle green — primary UI
    "navy-hover": "#16382C",
    teal: "#2F6B5A", // forest accent
    gold: "#B08D57", // brass foil — seal only

    // AmaraVisa logo accents
    "brand-blue": "#2B5CFF",
    "brand-purple": "#7B3FE4",

    // Semantic (warm-tuned)
    success: "#3D6B4F",
    warning: "#A67C2D",
    danger: "#9B3D32",
    border: "#E6E3DE",
    "border-strong": "#D1CDC6",

    // Aliases used by shadcn-style components
    primary: "#1F4A3A",
    "primary-foreground": "#FFFFFF",
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
    card: "14px",
    dialog: "18px",
    DEFAULT: "12px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    full: "9999px",
  },

  boxShadow: {
    card: "0 1px 3px rgba(28, 20, 16, 0.04), 0 4px 16px rgba(28, 20, 16, 0.05)",
    premium: "0 8px 32px rgba(28, 20, 16, 0.08), 0 2px 8px rgba(28, 20, 16, 0.04)",
    stamp: "inset 0 0 0 1px currentColor",
    lift: "0 20px 56px rgba(28, 20, 16, 0.12), 0 4px 12px rgba(28, 20, 16, 0.05)",
    float: "0 12px 48px rgba(28, 20, 16, 0.12), 0 2px 6px rgba(28, 20, 16, 0.04)",
    dialog: "0 24px 80px rgba(28, 20, 16, 0.18), 0 8px 24px rgba(28, 20, 16, 0.08)",
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
      spring: [0.34, 1.56, 0.64, 1],
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
    "slide-up": {
      "0%": { transform: "translateY(8px)", opacity: "0" },
      "100%": { transform: "translateY(0)", opacity: "1" },
    },
    "scale-in-bounce": {
      "0%": { transform: "scale(0.9)", opacity: "0" },
      "60%": { transform: "scale(1.02)", opacity: "1" },
      "100%": { transform: "scale(1)", opacity: "1" },
    },
    shimmer: {
      "0%": { backgroundPosition: "-200% 0" },
      "100%": { backgroundPosition: "200% 0" },
    },
    "glow-breathe": {
      "0%, 100%": { opacity: "0.5" },
      "50%": { opacity: "1" },
    },
  },

  animation: {
    "stamp-in": "stamp-in 480ms cubic-bezier(0.16, 1, 0.3, 1)",
    "fade-up": "fade-up 420ms cubic-bezier(0.16, 1, 0.3, 1)",
    "slide-up": "slide-up 350ms cubic-bezier(0.16, 1, 0.3, 1)",
    "scale-in-bounce": "scale-in-bounce 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    shimmer: "shimmer 1.6s linear infinite",
    "glow-breathe": "glow-breathe 2s ease-in-out infinite",
  },
};
