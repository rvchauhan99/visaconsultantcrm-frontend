/** Tailwind config — CRM. Editorial Luxe tokens from @passage/ui. */
const tokens = require("../packages/ui/tokens");

module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
        "../packages/ui/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                ...tokens.colors,
                /* Extended palette from upgraded theme.css */
                "navy-deep": "var(--navy-deep, #0f2820)",
                "teal-light": "var(--teal-light, #4a8a75)",
                "gold-light": "var(--gold-light, #c9a96e)",
                "gold-pale":  "var(--gold-pale, #f5e8c8)",
                "surface-warm": "var(--surface-warm, #ffffff)",
                "ink-subtle": "var(--ink-subtle, #9b8e83)",
                background: tokens.colors.surface,
                foreground: tokens.colors.ink,
                card: { DEFAULT: tokens.colors["surface-card"], foreground: tokens.colors.ink },
                popover: { DEFAULT: tokens.colors["surface-elevated"], foreground: tokens.colors.ink },
                primary: { DEFAULT: tokens.colors.navy, foreground: "#FFFFFF" },
                secondary: { DEFAULT: tokens.colors["surface-muted"], foreground: tokens.colors.ink },
                muted: { DEFAULT: tokens.colors["surface-muted"], foreground: tokens.colors["ink-muted"] },
                accent: { DEFAULT: tokens.colors.teal, foreground: "#FFFFFF" },
                destructive: { DEFAULT: tokens.colors.danger, foreground: "#FFFFFF" },
                input: tokens.colors.border,
                ring: tokens.colors.navy,
            },
            boxShadow: {
                ...tokens.boxShadow,
                "glow-navy": "0 0 0 1px rgba(31,74,58,0.2), 0 4px 16px rgba(31,74,58,0.18)",
                "glow-gold":  "0 0 0 1px rgba(176,141,87,0.18), 0 4px 12px rgba(176,141,87,0.15)",
            },
            fontFamily: tokens.fontFamily,
            borderRadius: {
                ...tokens.borderRadius,
                "crm": "8px",
            },
            keyframes: {
                "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
                "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
                ...tokens.keyframes,
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                ...tokens.animation,
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
