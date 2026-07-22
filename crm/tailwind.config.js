/** Tailwind config with the visa consultancy design tokens.
 *  Colors match /app/design_guidelines.json exactly. */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
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
                // Shadcn-compatible aliases (mapped to design tokens)
                background: "#F7F7F4",
                foreground: "#16202E",
                card: { DEFAULT: "#FFFFFF", foreground: "#16202E" },
                popover: { DEFAULT: "#FFFFFF", foreground: "#16202E" },
                primary: { DEFAULT: "#132A4C", foreground: "#FFFFFF" },
                secondary: { DEFAULT: "#F0EFEA", foreground: "#16202E" },
                muted: { DEFAULT: "#F0EFEA", foreground: "#5B6774" },
                accent: { DEFAULT: "#0E6E68", foreground: "#FFFFFF" },
                destructive: { DEFAULT: "#B23B2E", foreground: "#FFFFFF" },
                border: "#E3E1DA",
                input: "#E3E1DA",
                ring: "#132A4C",
            },
            fontFamily: {
                display: ['"Fraunces"', "serif"],
                sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
                mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
            },
            borderRadius: {
                DEFAULT: "12px",
                sm: "6px",
                md: "8px",
                lg: "12px",
                xl: "16px",
            },
            boxShadow: {
                card: "0 1px 2px 0 rgba(22, 32, 46, 0.04), 0 1px 3px 0 rgba(22, 32, 46, 0.06)",
                stamp: "inset 0 0 0 1px currentColor",
            },
            keyframes: {
                "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
                "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
                "stamp-in": {
                    "0%": { transform: "scale(1.4) rotate(-6deg)", opacity: "0" },
                    "60%": { transform: "scale(0.98) rotate(-2deg)", opacity: "0.9" },
                    "100%": { transform: "scale(1) rotate(-2deg)", opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "stamp-in": "stamp-in 400ms ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
