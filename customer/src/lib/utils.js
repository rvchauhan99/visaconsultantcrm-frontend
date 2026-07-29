import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCaseNumber(caseRecord) {
  if (!caseRecord) return "—";
  return caseRecord.case_number || `#${String(caseRecord.id || "").slice(0, 8)}`;
}

export const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInDate(value, opts = { day: "numeric", month: "short" }) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", opts);
}

export function humanizeKey(key = "") {
  return key.replace(/_/g, " ");
}

export function guaranteedByText(processingDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + Number(processingDays || 0) + 2);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const STAGE_LABELS = {
  new: "Application received",
  docs_pending: "In review",
  ready_to_submit: "Preparing",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Completed",
};

export const SUPPORT = {
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@amaravisa.com",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-80-0000-0000",
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "https://wa.me/918000000000",
  crmUrl: process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3001/login",
};
