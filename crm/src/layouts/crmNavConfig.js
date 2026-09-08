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
  Shield,
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
      { to: "/", label: "Dashboard", testid: "crm-nav-dashboard", end: true, icon: LayoutGrid, menuKey: "dashboard" },
      { to: "/reports", label: "Case reports", testid: "crm-nav-case-reports", icon: BarChart3, except: ["/reports/payments"], menuKey: "case_reports" },
      { to: "/reports/payments", label: "Payment reports", testid: "crm-nav-payments", icon: CreditCard, menuKey: "payment_reports" },
      { to: "/leads/analysis", label: "Lead analytics", testid: "crm-nav-lead-analytics", icon: TrendingUp, menuKey: "lead_analytics" },
    ],
  },
  {
    id: "cases",
    label: "Cases",
    testid: "crm-nav-cases",
    icon: KanbanSquare,
    activePrefixes: ["/cases"],
    children: [
      { to: "/pipeline", label: "Pipeline", testid: "crm-nav-pipeline", icon: KanbanSquare, menuKey: "pipeline" },
      { to: "/cases/closed", label: "Closed cases", testid: "crm-nav-closed", icon: Archive, menuKey: "closed_cases" },
      { to: "/offline-case", label: "New offline case", testid: "crm-nav-offline", icon: PlusSquare, menuKey: "offline_case" },
      { to: "/tasks", label: "Tasks", consultantLabel: "My tasks", testid: "crm-nav-tasks", icon: ListChecks, menuKey: "tasks" },
    ],
  },
  {
    id: "people",
    label: "People",
    testid: "crm-nav-people",
    icon: Users,
    activePrefixes: ["/clients"],
    children: [
      { to: "/leads", label: "Leads", testid: "crm-nav-leads", icon: UserPlus, except: ["/leads/analysis"], menuKey: "leads" },
      { to: "/clients", label: "Clients", testid: "crm-nav-clients", icon: Users, menuKey: "clients" },
      { to: "/follow-ups", label: "Follow-ups", testid: "crm-nav-follow-ups", icon: PhoneCall, menuKey: "follow_ups" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    testid: "crm-nav-operations",
    icon: Briefcase,
    children: [
      { to: "/service-orders", label: "Service orders", testid: "crm-nav-service-orders", icon: Layers, menuKey: "service_orders" },
      { to: "/finance", label: "Finance", testid: "crm-nav-finance", icon: Wallet, menuKey: "finance" },
      { to: "/inbox", label: "Inbox", testid: "crm-nav-inbox", icon: Inbox, menuKey: "inbox" },
    ],
  },
  {
    id: "client-care",
    label: "Client care",
    testid: "crm-nav-client-care",
    icon: CalendarDays,
    children: [
      { to: "/passport-expiry", label: "Passport expiry", testid: "crm-nav-expiry", icon: StampIcon, menuKey: "passport_expiry" },
      { to: "/birthdays", label: "Birthdays", testid: "crm-nav-birthdays", icon: Cake, menuKey: "birthdays" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    testid: "crm-nav-admin",
    icon: Settings,
    activePrefixes: ["/products", "/passport-products"],
    children: [
      { to: "/products", label: "Visa products", testid: "crm-nav-products", icon: Layers, menuKey: "visa_products" },
      { to: "/passport-products", label: "Passport products", testid: "crm-nav-passport-products", icon: StampIcon, menuKey: "passport_products" },
      { to: "/document-master", label: "Document master", testid: "crm-nav-doc-master", icon: FileText, menuKey: "document_master" },
      { to: "/field-master", label: "Field master", testid: "crm-nav-field-master", icon: FormInput, menuKey: "field_master" },
      { to: "/consultants", label: "User Master", testid: "crm-nav-consultants", icon: Users2, menuKey: "user_master" },
      { to: "/roles", label: "Role Master", testid: "crm-nav-roles", icon: Shield, menuKey: "role_master" },
      { to: "/case-number-settings", label: "Case numbers", testid: "crm-nav-case-number-settings", icon: ListChecks, menuKey: "case_numbers" },
    ],
  },
];

const EXTRA_ROUTE_LABELS = {
  "/leads/new": "Add Lead",
  "/profile": "Profile",
  "/inbox": "Communications",
  "/case-number-settings": "Case number settings",
  "/follow-ups": "Lead follow-ups",
  "/roles": "Role Master",
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

export function childNavLabel(child, role, unrestrictedScope) {
  if (child.consultantLabel && !unrestrictedScope && role !== "admin") return child.consultantLabel;
  return child.label;
}

export function userHasMenu(user, menuKey) {
  if (!menuKey) return true;
  const keys = user?.menu_keys;
  if (Array.isArray(keys)) return keys.includes(menuKey);
  if (user?.role === "admin") return true;
  const consultantDefaults = [
    "dashboard", "case_reports", "payment_reports", "lead_analytics",
    "pipeline", "closed_cases", "offline_case", "tasks",
    "leads", "clients", "follow_ups",
    "service_orders", "finance", "inbox",
    "passport_expiry", "birthdays",
  ];
  return consultantDefaults.includes(menuKey);
}

export function filterNavGroups(user) {
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      children: group.children.filter((child) => userHasMenu(user, child.menuKey)),
    }))
    .filter((group) => group.children.length > 0);
}

export const ROUTE_MENU_KEYS = (() => {
  const map = {
    "/leads/new": "leads",
    "/products/:productId": "visa_products",
    "/passport-products/:productId": "passport_products",
    "/clients/:customerId": "clients",
    "/cases/:caseId": "pipeline",
  };
  for (const group of NAV_GROUPS) {
    for (const child of group.children) {
      if (child.menuKey) map[child.to] = child.menuKey;
    }
  }
  return map;
})();

export function firstAllowedPath(user) {
  for (const group of NAV_GROUPS) {
    for (const child of group.children) {
      if (userHasMenu(user, child.menuKey)) return child.to;
    }
  }
  return "/profile";
}

export function menuKeyForPath(pathname) {
  if (ROUTE_MENU_KEYS[pathname]) return ROUTE_MENU_KEYS[pathname];
  if (pathname.startsWith("/products/")) return "visa_products";
  if (pathname.startsWith("/passport-products/")) return "passport_products";
  if (pathname.startsWith("/clients/")) return "clients";
  if (pathname.startsWith("/cases/") && pathname !== "/cases/closed") return "pipeline";
  if (pathname === "/leads/new") return "leads";
  if (pathname === "/profile" || pathname === "/login") return null;
  return ROUTE_MENU_KEYS[pathname] || null;
}
