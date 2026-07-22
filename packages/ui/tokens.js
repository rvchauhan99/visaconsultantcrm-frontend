/** Shared Passage design tokens — keep customer + CRM in sync. */
module.exports = {
  colors: {
    ink: "#16202E",
    "ink-muted": "#5B6774",
    surface: "#F7F7F4",
    "surface-card": "#FFFFFF",
    navy: "#132A4C",
    "navy-hover": "#1B3A66",
    teal: "#0E6E68",
    gold: "#A9791F",
    success: "#2E7D4F",
    warning: "#B4791A",
    danger: "#B23B2E",
    border: "#E3E1DA",
  },
  fontFamily: {
    display: ['"Fraunces"', "serif"],
    sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
    mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
  },
  keyframes: {
    "stamp-in": {
      "0%": { transform: "scale(1.4) rotate(-6deg)", opacity: "0" },
      "60%": { transform: "scale(0.98) rotate(-2deg)", opacity: "0.9" },
      "100%": { transform: "scale(1) rotate(-2deg)", opacity: "1" },
    },
  },
  animation: {
    "stamp-in": "stamp-in 400ms ease-out",
  },
};
