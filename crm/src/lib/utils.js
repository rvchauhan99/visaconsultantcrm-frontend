import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCaseNumber(caseRecord) {
  if (!caseRecord) return "—";
  if (typeof caseRecord === "string") {
    return caseRecord.includes("-") && caseRecord.length > 12
      ? caseRecord
      : `#${caseRecord.slice(0, 8)}`;
  }
  return caseRecord.case_number
    || `#${String(caseRecord.id || caseRecord.case_id || "").slice(0, 8)}`
    || "—";
}
