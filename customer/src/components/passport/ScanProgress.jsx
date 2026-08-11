"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Image received",
  "Passport detected",
  "MRZ detected",
  "Reading passport",
  "Validating information",
  "Preparing your form",
];

export default function ScanProgress({ active }) {
  if (!active) return null;
  return (
    <div
      className="bg-surface border border-border rounded-xl p-4 mb-4 space-y-2"
      data-testid="scan-progress"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm text-navy font-medium">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking passport…
      </div>
      <ul className="space-y-1.5">
        {STEPS.map((label, i) => (
          <li key={label} className={cn("flex items-center gap-2 text-xs text-ink-muted")}>
            <Check className="w-3 h-3 text-teal shrink-0" aria-hidden />
            <span className={i === STEPS.length - 1 ? "text-ink" : ""}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
