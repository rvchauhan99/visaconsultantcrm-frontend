import React from "react";
import { cn } from "@/lib/utils";

/**
 * Stamp — the signature UI element for this app.
 * Communicates status as a passport/visa seal, not a generic pill.
 * See /app/design_guidelines.json § components.TheStamp.
 *
 * Variants:
 *   tone:  ink | gold | teal | success | warning | danger | muted
 *   size:  sm | md | lg
 *   fill:  outline (double-ring) | filled
 */
export default function Stamp({ children, tone = "ink", size = "md", fill = "outline", className, ...rest }) {
    const toneClass = {
        ink: "stamp-ink",
        gold: "stamp-gold",
        teal: "stamp-teal",
        success: "stamp-success",
        warning: "stamp-warning",
        danger: "stamp-danger",
        muted: "stamp-muted",
    }[tone];

    const sizeClass = { sm: "text-[0.6rem] px-2 py-1", md: "", lg: "stamp-lg" }[size];
    const fillClass = fill === "filled" ? "stamp-filled" : "";

    return (
        <span className={cn("stamp", toneClass, sizeClass, fillClass, className)} {...rest}>
            {children}
        </span>
    );
}
