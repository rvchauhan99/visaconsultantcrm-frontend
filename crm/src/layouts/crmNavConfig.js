import {
  Archive,
  BarChart3,
  Briefcase,
  Cake,
  CalendarDays,
  CreditCard,
  FileText,
  FormInput,
  Inbox,
  KanbanSquare,
  Layers,
  LayoutGrid,
  ListChecks,
  PhoneCall,
  PlusSquare,
  Settings,
  StampIcon,
  TrendingUp,
  UserPlus,
  Users,
  Users2,
  Wallet,
} from "lucide-react";

/**
 * CRM sidebar tree — grouped by workflow (HubSpot / Salesforce style).
 * Add a page here and it appears in the rail; URLs stay owned by App.js.
 */
export const NAV_GROUPS = [
  {
    id: "insights",
    label: "Insights",
    testid: "crm-nav-insights",
    icon: BarChart3,
    children: [
      { to: "/", label: "Dashboard", testid: "crm-nav-dashboard", end: true, icon: LayoutGrid },
      { to: "/reports", label: "Case reports", testid: "crm-nav-case-reports", icon: BarChart3, except: ["/reports/payments"] },
      { to: "/reports/payments", label: "Payment reports", testid: "crm-nav-payments", icon: CreditCard },
      { to: "/leads/analysis", label: "Lead analytics", testid: "crm-nav-lead-analytics", icon: TrendingUp },
    ],
  },
  {
    id: "cases",
    label: "Cases",
    testid: "crm-nav-cases",
    icon: KanbanSquare,
    activePrefixes: ["/cases"],
    children: [
      { to: "/pipeline", label: "Pipeline", testid: "crm-nav-pipeline", icon: KanbanSquare },
      { to: "/cases/closed", label: "Closed cases", testid: "crm-nav-closed", icon: Archive },
      { to: "/offline-case", label: "New offline case", testid: "crm-nav-offline", icon: PlusSquare },
      { to: "/tasks", label: "Tasks", consultantLabel: "My tasks", testid: "crm-nav-tasks", icon: ListChecks },
    ],
  },
  {
    id: "people",
    label: "People",
    testid: "crm-nav-people",
    icon: Users,
    activePrefixes: ["/clients"],
    children: [
      { to: "/leads", label: "Leads", testid: "crm-nav-leads", icon: UserPlus, except: ["/leads/analysis"] },
      { to: "/clients", label: "Clients", testid: "crm-nav-clients", icon: Users },
      { to: "/follow-ups", label: "Follow-ups", testid: "crm-nav-follow-ups", icon: PhoneCall },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    testid: "crm-nav-operations",
    icon: Briefcase,
    children: [
      { to: "/service-orders", label: "Service orders", testid: "crm-nav-service-orders", icon: Layers },
      { to: "/finance", label: "Finance", testid: "crm-nav-finance", icon: Wallet },
      { to: "/inbox", label: "Inbox", testid: "crm-nav-inbox", icon: Inbox },
    ],
  },
  {
    id: "client-care",
    label: "Client care",
    testid: "crm-nav-client-care",
    icon: CalendarDays,
    children: [
      { to: "/passport-expiry", label: "Passport expiry", testid: "crm-nav-expiry", icon: StampIcon },
      { to: "/birthdays", label: "Birthdays", testid: "crm-nav-birthdays", icon: Cake },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    testid: "crm-nav-admin",
    icon: Settings,
    adminOnly: true,
    activePrefixes: ["/products", "/passport-products"],
    children: [
      { to: "/products", label: "Visa products", testid: "crm-nav-products", icon: Layers },
      { to: "/passport-products", label: "Passport products", testid: "crm-nav-passport-products", icon: StampIcon },
      { to: "/document-master", label: "Document master", testid: "crm-nav-doc-master", icon: FileText },
      { to: "/field-master", label: "Field master", testid: "crm-nav-field-master", icon: FormInput },
      { to: "/consultants", label: "Consultants", testid: "crm-nav-consultants", icon: Users2 },
      { to: "/case-number-settings", label: "Case numbers", testid: "crm-nav-case-number-settings", icon: ListChecks },
    ],
  },
];

const EXTRA_ROUTE_LABELS = {
  "/leads/new": "Add Lead",
  "/profile": "Profile",
  "/inbox": "Communications",
  "/case-number-settings": "Case number settings",
  "/follow-ups": "Lead follow-ups",
};

function pathMatches(to, pathname, end) {
  if (to === "/" || end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function prefixMatches(prefix, pathname) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isChildActive(child, pathname) {
  if (!pathMatches(child.to, pathname, child.end)) return false;
  if ((child.except || []).some((ex) => pathMatches(ex, pathname, false))) return false;
  return true;
}

export function findGroupIdForPath(pathname) {
  let bestId = null;
  let bestLen = -1;
  for (const group of NAV_GROUPS) {
    for (const child of group.children) {
      if (!isChildActive(child, pathname)) continue;
      if (child.to.length > bestLen) {
        bestLen = child.to.length;
        bestId = group.id;
      }
    }
  }
  if (bestId) return bestId;
  for (const group of NAV_GROUPS) {
    if ((group.activePrefixes || []).some((prefix) => prefixMatches(prefix, pathname))) {
      return group.id;
    }
  }
  return null;
}

export function isGroupActive(group, pathname) {
  return findGroupIdForPath(pathname) === group.id;
}

export const ROUTE_LABELS = (() => {
  const labels = { ...EXTRA_ROUTE_LABELS };
  for (const group of NAV_GROUPS) {
    for (const child of group.children) {
      if (!labels[child.to]) labels[child.to] = child.label;
    }
  }
  return labels;
})();

export function childNavLabel(child, role) {
  if (child.consultantLabel && role !== "admin") return child.consultantLabel;
  return child.label;
}
