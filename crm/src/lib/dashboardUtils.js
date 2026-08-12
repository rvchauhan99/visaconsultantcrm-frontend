import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import { SERVICE_TYPE_LABELS } from "@/lib/leadServiceSchemas";

export const QUICK_PERIODS = [
  { id: "7d", label: "7 days" },
  { id: "15d", label: "15 days" },
  { id: "30d", label: "30 days" },
  { id: "6m", label: "6 months" },
  { id: "1y", label: "1 year" },
];

export const STAGE_ORDER = ["new", "docs_pending", "ready_to_submit", "submitted", "decision", "closed"];
export const STAGE_LABELS = {
  new: "New",
  docs_pending: "Docs pending",
  ready_to_submit: "Ready",
  submitted: "Submitted",
  decision: "Decision",
  closed: "Closed",
};

export const SLA_COLORS = {
  on_track: "success",
  due_soon: "warning",
  overdue: "danger",
  completed: "muted",
};

export const CHART_COLORS = ["#1F4A3A", "#2F6B5A", "#C4A052", "#B45309", "#DC2626", "#64748B", "#0EA5E9"];

export function todayDate() {
  return startOfDay(new Date());
}

export function isoDate(d) {
  return format(d, "yyyy-MM-dd");
}

export function periodToRange(periodId) {
  const today = todayDate();
  let from = today;
  switch (periodId) {
    case "7d":
      from = subDays(today, 7);
      break;
    case "15d":
      from = subDays(today, 15);
      break;
    case "30d":
      from = subDays(today, 30);
      break;
    case "6m":
      from = subMonths(today, 6);
      break;
    case "1y":
      from = subYears(today, 1);
      break;
    default:
      from = subDays(today, 30);
  }
  return { from_date: isoDate(from), to_date: isoDate(today) };
}

export function detectPeriod(from, to) {
  if (!from || !to) return "";
  for (const p of QUICK_PERIODS) {
    const range = periodToRange(p.id);
    if (range.from_date === from && range.to_date === to) return p.id;
  }
  return "";
}

export function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

export function serviceTypeLabel(key) {
  return SERVICE_TYPE_LABELS[key] || key;
}

export function pickScope(scope, keys) {
  if (!scope || !keys?.length) return {};
  const out = {};
  keys.forEach((k) => {
    if (scope[k] != null && scope[k] !== "") out[k] = scope[k];
  });
  return out;
}

export function appendScope(path, scope) {
  if (!scope || Object.keys(scope).length === 0) return path;
  const [base, qs = ""] = path.split("?");
  const params = new URLSearchParams(qs);
  Object.entries(scope).forEach(([k, v]) => {
    if (v != null && v !== "") params.set(k, v);
  });
  const out = params.toString();
  return out ? `${base}?${out}` : base;
}

export function buildDashboardParams(filters, q) {
  const keys = [
    "from_date", "to_date", "country", "source", "consultant_id", "stage", "sla",
    "payment_status", "on_hold", "unassigned", "decision", "visa_type", "case_type", "service_type",
  ];
  const p = {};
  keys.forEach((key) => {
    const v = filters[key];
    if (v != null && v !== "") p[key] = v;
  });
  if (q) p.q = q;
  if (!p.to_date && p.from_date) p.to_date = isoDate(todayDate());
  if (!p.from_date && !p.to_date) {
    const fallback = periodToRange(filters.period || "30d");
    p.from_date = fallback.from_date;
    p.to_date = fallback.to_date;
  }
  return p;
}

export const QUEUE_SECTIONS = [
  {
    title: "Leads",
    items: [
      { key: "leads_due_today", label: "Due today", to: "/follow-ups?due=today", tone: "warning" },
      { key: "leads_overdue", label: "Overdue", to: "/follow-ups?due=overdue", tone: "danger" },
    ],
  },
  {
    title: "Tasks",
    items: [
      { key: "tasks_due_today", label: "Due today", to: "/tasks?status=open&due=today", tone: "warning" },
      { key: "tasks_overdue", label: "Overdue", to: "/tasks?status=open&due=overdue", tone: "danger" },
    ],
  },
  {
    title: "Cases",
    items: [
      { key: "unassigned_cases", label: "Unassigned", to: "/pipeline?unassigned=true", tone: "default" },
      { key: "docs_pending_review", label: "Docs to review", to: "/pipeline?stage=docs_pending", tone: "default" },
      { key: "on_hold", label: "On hold", to: "/pipeline?on_hold=true", tone: "warning" },
    ],
  },
  {
    title: "Finance",
    items: [
      { key: "pending_payments", label: "Pending payments", to: "/pipeline?payment_status=pending", tone: "warning" },
    ],
  },
];

export const RISK_ITEMS = [
  { key: "overdue_sla", label: "SLA overdue", to: "/pipeline?sla=overdue", tone: "danger" },
  { key: "unassigned_7d", label: "Unassigned 7+ days", to: "/pipeline?unassigned=true", tone: "warning" },
  { key: "on_hold_14d", label: "On hold 14+ days", to: "/pipeline?on_hold=true", tone: "warning" },
  { key: "docs_stuck_received", label: "Docs stuck in review", to: "/pipeline?stage=docs_pending", tone: "warning" },
  { key: "pending_payment_7d", label: "Pending payment 7+ days", to: "/pipeline?payment_status=pending", tone: "warning" },
  { key: "passport_expiry_180d", label: "Passport expiry (180d)", to: "/passport-expiry?days=180", tone: "warning" },
  { key: "leads_overdue", label: "Leads overdue", to: "/follow-ups?due=overdue", tone: "danger" },
  { key: "tasks_overdue", label: "Tasks overdue", to: "/tasks?status=open&due=overdue", tone: "danger" },
  { key: "stale_in_progress", label: "Stale service orders", to: "/service-orders?status=in_progress", tone: "warning" },
];
