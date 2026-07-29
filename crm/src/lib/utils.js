import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Safe string for toasts — FastAPI `detail` may be a string or validation-error objects. */
export function apiErrorMessage(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.msg) {
          const loc = Array.isArray(item.loc)
            ? item.loc.filter((x) => x !== "body" && x !== "query").join(".")
            : "";
          return loc ? `${loc}: ${item.msg}` : item.msg;
        }
        return null;
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : fallback;
  }
  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.msg === "string") return detail.msg;
  }
  return fallback;
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
