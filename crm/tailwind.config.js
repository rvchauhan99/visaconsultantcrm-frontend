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
                background: tokens.colors.surface,
                foreground: tokens.colors.ink,
                card: { DEFAULT: tokens.colors["surface-card"], foreground: tokens.colors.ink },
                popover: { DEFAULT: tokens.colors["surface-elevated"], foreground: tokens.colors.ink },
                primary: { DEFAULT: tokens.colors.navy, foreground: "#FFFCF7" },
                secondary: { DEFAULT: tokens.colors["surface-muted"], foreground: tokens.colors.ink },
                muted: { DEFAULT: tokens.colors["surface-muted"], foreground: tokens.colors["ink-muted"] },
                accent: { DEFAULT: tokens.colors.teal, foreground: "#FFFCF7" },
                destructive: { DEFAULT: tokens.colors.danger, foreground: "#FFFCF7" },
                input: tokens.colors.border,
                ring: tokens.colors.navy,
            },
            fontFamily: tokens.fontFamily,
            borderRadius: tokens.borderRadius,
            boxShadow: tokens.boxShadow,
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
