import React, { useEffect, useState } from "react";
import { Outlet, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import {
  LogOut, KanbanSquare, Layers, Users2, BarChart3,
  PlusSquare, LayoutGrid, StampIcon, FileText, FormInput,
  ListChecks, ChevronDown, User, Menu, X, UserPlus, Wallet, Inbox, Archive, CreditCard, PhoneCall,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import NotificationBell from "@/components/crm/NotificationBell";
import CrmSearch from "@/components/crm/CrmSearch";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { cn } from "@/lib/utils";

const ROUTE_LABELS = {
  "/":               "Dashboard",
  "/pipeline":       "Pipeline",
  "/cases/closed":   "Closed cases",
  "/tasks":          "My tasks",
  "/leads":          "Leads",
  "/follow-ups":     "Lead follow-ups",
  "/finance":        "Finance",
  "/reports/payments": "Payment reports",
  "/inbox":          "Communications",
  "/passport-expiry":"Passport expiry",
  "/offline-case":   "New offline case",
  "/reports":        "Reports",
  "/products":       "Visa products",
  "/document-master":"Document master",
  "/field-master":   "Field master",
  "/consultants":    "Consultants",
  "/case-number-settings": "Case number settings",
  "/profile":        "Profile",
};

/**
 * CRM layout — Editorial Luxe at compact density.
 * Dark navy-deep sidebar, ivory content area.
 * Collapsible drawer on narrow screens.
 * Collapsible sidebar on desktop (icon-only ↔ full).
 */
export default function CrmLayout() {
  const user = getUser();
  const nav = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collapsible sidebar state — persisted to localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("crm_sidebar_collapsed") === "true"; } catch { return false; }
  });
  // Hover-to-expand when collapsed
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("crm_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
    setHoverExpanded(false);
  };

  // Whether sidebar is visually expanded (either not collapsed, or hover-expanded)
  const isExpanded = !collapsed || hoverExpanded;

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const logout = () => {
    clearSession();
    nav("/login");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumb = pathParts.length === 0
    ? "Dashboard"
    : location.pathname === "/cases/closed"
      ? "Closed cases"
      : location.pathname === "/reports/payments"
        ? "Payment reports"
        : pathParts.length === 2 && pathParts[0] === "cases"
          ? `Case #${pathParts[1].slice(0, 8)}`
          : pathParts[0] === "tasks" && user?.role === "admin"
            ? "Tasks"
            : ROUTE_LABELS[`/${pathParts[0]}`] ?? pathParts[0];

  let hoverTimeout;
  const onSidebarMouseEnter = () => {
    if (!collapsed) return;
    hoverTimeout = setTimeout(() => setHoverExpanded(true), 150);
  };
  const onSidebarMouseLeave = () => {
    clearTimeout(hoverTimeout);
    setHoverExpanded(false);
    setProfileOpen(false);
  };

  const sidebarContent = (forceFull = false) => {
    const showLabels = forceFull || isExpanded;
    return (
      <>
        <div className={cn(
          "border-b border-navy-sidebar flex items-center gap-2.5",
          showLabels ? "px-3 py-3.5 justify-between" : "px-2 py-3.5 justify-center"
        )}>
          <Link to="/" className={cn("flex items-center min-w-0", showLabels ? "gap-2.5" : "gap-0")} data-testid="crm-logo">
            {showLabels ? (
              <div className="min-w-0 transition-opacity duration-200">
                <AmaraVisaLogo size="sm" invert className="opacity-95 max-w-[140px]" />
                <div className="text-[10px] font-mono uppercase tracking-widest text-[rgba(255,252,247,0.35)] mt-0.5">Ops desk</div>
              </div>
            ) : (
              <AmaraVisaLogo size="sm" invert className="opacity-95 max-w-[36px] overflow-hidden" />
            )}
          </Link>
          {/* Close button for mobile only */}
          {forceFull && (
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-md text-[rgba(255,252,247,0.6)] hover:bg-navy-sidebar-hover"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              data-testid="crm-sidebar-close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className={cn(
          "flex-1 overflow-y-auto",
          showLabels ? "p-2 space-y-0.5" : "p-1.5 space-y-0.5"
        )}>
          <RailLink to="/" icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard" testid="crm-nav-dashboard" end showLabel={showLabels} />
          <RailLink to="/pipeline" icon={<KanbanSquare className="w-4 h-4" />} label="Pipeline" testid="crm-nav-pipeline" showLabel={showLabels} />
          <RailLink to="/cases/closed" icon={<Archive className="w-4 h-4" />} label="Closed cases" testid="crm-nav-closed" showLabel={showLabels} />
          <RailLink to="/tasks" icon={<ListChecks className="w-4 h-4" />} label={user?.role === "admin" ? "Tasks" : "My tasks"} testid="crm-nav-tasks" showLabel={showLabels} />
          <RailLink to="/leads" icon={<UserPlus className="w-4 h-4" />} label="Leads" testid="crm-nav-leads" showLabel={showLabels} />
          <RailLink to="/follow-ups" icon={<PhoneCall className="w-4 h-4" />} label="Follow-ups" testid="crm-nav-follow-ups" showLabel={showLabels} />
          <RailLink to="/finance" icon={<Wallet className="w-4 h-4" />} label="Finance" testid="crm-nav-finance" showLabel={showLabels} />
          <RailLink to="/reports/payments" icon={<CreditCard className="w-4 h-4" />} label="Payments" testid="crm-nav-payments" showLabel={showLabels} />
          <RailLink to="/inbox" icon={<Inbox className="w-4 h-4" />} label="Inbox" testid="crm-nav-inbox" showLabel={showLabels} />
          <RailLink to="/passport-expiry" icon={<StampIcon className="w-4 h-4" />} label="Passport expiry" testid="crm-nav-expiry" showLabel={showLabels} />
          <RailLink to="/offline-case" icon={<PlusSquare className="w-4 h-4" />} label="New offline case" testid="crm-nav-offline" showLabel={showLabels} />
          <RailLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" testid="crm-nav-reports" showLabel={showLabels} />

          {user?.role === "admin" && (
            <>
              {showLabels ? (
                <div className="mt-4 mb-1 px-2 text-[9px] uppercase font-mono tracking-[0.2em] text-[rgba(255,252,247,0.3)]">
                  Admin
                </div>
              ) : (
                <div className="mt-3 mb-1 mx-auto w-5 border-t border-[rgba(255,252,247,0.12)]" />
              )}
              <RailLink to="/products" icon={<Layers className="w-4 h-4" />} label="Visa products" testid="crm-nav-products" showLabel={showLabels} />
              <RailLink to="/document-master" icon={<FileText className="w-4 h-4" />} label="Document master" testid="crm-nav-doc-master" showLabel={showLabels} />
              <RailLink to="/field-master" icon={<FormInput className="w-4 h-4" />} label="Field master" testid="crm-nav-field-master" showLabel={showLabels} />
              <RailLink to="/consultants" icon={<Users2 className="w-4 h-4" />} label="Consultants" testid="crm-nav-consultants" showLabel={showLabels} />
              <RailLink to="/case-number-settings" icon={<ListChecks className="w-4 h-4" />} label="Case numbers" testid="crm-nav-case-number-settings" showLabel={showLabels} />
            </>
          )}
        </nav>

        {/* Collapse toggle — desktop only */}
        {!forceFull && (
          <div className="hidden lg:block px-2 py-1.5 border-t border-navy-sidebar">
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs",
                "text-[rgba(255,252,247,0.5)] hover:text-[rgba(255,252,247,0.8)] hover:bg-navy-sidebar-hover transition-colors",
                !showLabels && "justify-center"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              data-testid="crm-sidebar-collapse-toggle"
            >
              {collapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <ChevronsLeft className="w-4 h-4 shrink-0" />}
              {showLabels && <span>{collapsed ? "Expand" : "Collapse"}</span>}
            </button>
          </div>
        )}

        <div className={cn("border-t border-navy-sidebar", showLabels ? "p-2" : "p-1.5")}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                "w-full flex items-center rounded-md text-left",
                "hover:bg-navy-sidebar-hover transition-colors",
                showLabels ? "gap-2.5 px-2 py-2" : "justify-center px-1.5 py-2"
              )}
              data-testid="crm-profile-trigger"
            >
              <span className={cn(
                "rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                "bg-[rgba(47,107,90,0.5)] text-[rgba(255,252,247,0.9)] border border-[rgba(255,252,247,0.1)]",
                showLabels ? "w-7 h-7" : "w-8 h-8"
              )}>
                {initials}
              </span>
              {showLabels && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-navy-sidebar-active truncate">{user?.full_name}</div>
                    <div className="text-[10px] font-mono uppercase text-[rgba(255,252,247,0.35)] capitalize">{user?.role}</div>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-[rgba(255,252,247,0.4)] shrink-0 transition-transform", profileOpen && "rotate-180")} />
                </>
              )}
            </button>

            {profileOpen && (
              <div className={cn(
                "absolute bottom-full left-0 right-0 mb-1 rounded-md overflow-hidden",
                "bg-[#1a3d2e] border border-[rgba(255,252,247,0.1)]",
                "shadow-[0_-4px_20px_rgba(0,0,0,0.3)]",
              )}>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs text-navy-sidebar hover:bg-navy-sidebar-hover transition-colors"
                  data-testid="crm-nav-profile"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile &amp; settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[rgba(155,61,50,0.9)] hover:bg-[rgba(155,61,50,0.1)] transition-colors"
                  data-testid="crm-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="crm-shell min-h-screen text-ink font-sans flex" style={{ background: "var(--surface)" }}>
      {/* Desktop sidebar — collapsible */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col transition-all duration-200 ease-in-out relative",
          collapsed && !hoverExpanded ? "w-[60px]" : "w-[220px]",
        )}
        style={{ background: "var(--navy-deep, #0f2820)" }}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
      >
        {/* When hover-expanded over a collapsed sidebar, show an elevated overlay */}
        {collapsed && hoverExpanded ? (
          <div
            className="absolute inset-y-0 left-0 w-[220px] z-50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
            style={{ background: "var(--navy-deep, #0f2820)" }}
          >
            {sidebarContent(false)}
          </div>
        ) : (
          sidebarContent(false)
        )}
      </aside>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="crm-sidebar-overlay"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "var(--navy-deep, #0f2820)" }}
        data-testid="crm-sidebar-drawer"
      >
        {sidebarContent(true)}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className={cn(
          "sticky top-0 z-30 h-12 flex items-center justify-between gap-3 px-4",
          "bg-surface-card/95 backdrop-blur border-b border-border",
          "shadow-[0_1px_0_var(--border)]",
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-md border border-border text-ink-muted hover:text-ink hover:bg-surface-muted"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              data-testid="crm-sidebar-toggle"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
              <span className="text-ink-muted/50">AmaraVisa</span>
              <span className="text-border-strong">/</span>
              <span className="text-ink font-medium truncate">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CrmSearch />
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RailLink({ to, icon, label, testid, end, showLabel = true }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      title={!showLabel ? label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-md text-xs font-medium transition-all duration-150",
          showLabel ? "gap-2.5 px-2.5 py-2" : "justify-center px-2 py-2.5",
          isActive
            ? [
                "bg-navy-sidebar-active text-navy-sidebar-active",
                "before:absolute before:left-0 before:top-1.5 before:bottom-1.5",
                "before:w-[3px] before:rounded-full before:bg-gold/70",
              ].join(" ")
            : "text-navy-sidebar hover:bg-navy-sidebar-hover hover:text-navy-sidebar-active",
        )
      }
    >
      <span className="shrink-0">{icon}</span>
      {showLabel && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
