"use client";

import { Check, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = {
  verified: "Verified",
  high_confidence: "Looks good",
  needs_review: "Please verify",
  missing: "Not detected",
  conflict: "Please verify",
  invalid: "Please verify",
};

export default function OCRFieldStatus({ status, className }) {
  if (!status || status === "missing") {
    return null;
  }
  const review = status === "needs_review" || status === "conflict" || status === "invalid";
  const ok = status === "verified" || status === "high_confidence";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium mt-1",
        ok && "text-teal",
        review && "text-amber-700",
        className,
      )}
      data-testid={`ocr-status-${status}`}
    >
      {ok ? <Check className="w-3 h-3" aria-hidden /> : null}
      {review ? <AlertTriangle className="w-3 h-3" aria-hidden /> : null}
      {status === "missing" ? <Minus className="w-3 h-3" aria-hidden /> : null}
      {LABELS[status] || "Please verify"}
    </span>
  );
}
