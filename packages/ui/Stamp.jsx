import React from "react";

/**
 * Stamp — passport/visa seal motif (shared across customer + CRM).
 * Prefer importing from `@passage/ui` so both apps stay aligned.
 *
 * tone: ink | gold | teal | success | warning | danger | muted
 * size: sm | md | lg
 * fill: outline | filled
 */
export default function Stamp({ children, tone = "ink", size = "md", fill = "outline", className = "", ...rest }) {
  const toneClass = {
    ink: "stamp-ink",
    gold: "stamp-gold",
    teal: "stamp-teal",
    success: "stamp-success",
    warning: "stamp-warning",
    danger: "stamp-danger",
    muted: "stamp-muted",
  }[tone] || "stamp-ink";

  const sizeClass = { sm: "text-[0.6rem] px-2 py-1", md: "", lg: "stamp-lg" }[size] || "";
  const fillClass = fill === "filled" ? "stamp-filled" : "";
  const cls = ["stamp", toneClass, sizeClass, fillClass, className].filter(Boolean).join(" ");

  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
