import React from "react";

/**
 * Seal (formerly Stamp) — foil seal motif for Passage Editorial Luxe.
 * tone: ink | gold | teal | success | warning | danger | muted
 * size: sm | md | lg
 * fill: outline | filled
 * Keeps `.stamp` classes for backward compatibility.
 */
export default function Seal({ children, tone = "ink", size = "md", fill = "outline", className = "", ...rest }) {
  const toneClass = {
    ink: "stamp-ink seal-ink",
    gold: "stamp-gold seal-brass",
    teal: "stamp-teal seal-forest",
    success: "stamp-success seal-success",
    warning: "stamp-warning seal-warning",
    danger: "stamp-danger seal-danger",
    muted: "stamp-muted seal-muted",
  }[tone] || "stamp-ink seal-ink";

  const sizeClass = { sm: "text-[0.6rem] px-2 py-1", md: "", lg: "stamp-lg seal-lg" }[size] || "";
  const fillClass = fill === "filled" ? "stamp-filled seal-filled" : "";
  const cls = ["stamp", "seal", toneClass, sizeClass, fillClass, className].filter(Boolean).join(" ");

  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/** @deprecated Use Seal — alias for migration */
export { Seal as Stamp };
