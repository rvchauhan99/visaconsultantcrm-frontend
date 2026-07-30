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
  const d = guaranteedByDate(processingDays);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function guaranteedByDate(processingDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + Number(processingDays || 0) + 2);
  d.setHours(14, 43, 0, 0);
  return d;
}

export function guaranteedByDateTime(processingDays = 0) {
  return guaranteedByDate(processingDays).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function countryCoverUrl(product) {
  if (product?.banner_image_url) return product.banner_image_url;
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=srgb&fm=jpg&q=80&w=900";
}

export function formatVisaTypeShort(type = "") {
  const map = {
    tourist: "E-VISA",
    business: "BUSINESS",
    transit: "TRANSIT",
    other_general: "VISA",
  };
  return map[type] || type.replace(/_/g, " ").toUpperCase();
}

export function formatValidityShort(days = 0) {
  const d = Number(days || 0);
  if (d >= 365) return `${Math.round(d / 365)} YR${d >= 730 ? "S" : ""}`;
  if (d >= 30) return `${Math.round(d / 30)} MO`;
  return `${d} DAYS`;
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

export function formatVisaType(type = "") {
  const map = { tourist: "Tourist", business: "Business", transit: "Transit", other_general: "General" };
  return map[type] || type.replace(/_/g, " ");
}

export function formatValidity(days = 0) {
  const d = Number(days || 0);
  if (d >= 365) return `${Math.round(d / 365)} yr${d >= 730 ? "s" : ""}`;
  if (d >= 30) return `${Math.round(d / 30)} mo`;
  return `${d} days`;
}

export function docsLabelForProduct(product) {
  const count = product?.required_documents_count ?? 0;
  if (count <= 2) return "Passport, Photo";
  if (count <= 4) return "Passport, Photo, Bank statement";
  if (count <= 6) return "Passport, Photo + financial docs";
  return `${count} documents required`;
}
