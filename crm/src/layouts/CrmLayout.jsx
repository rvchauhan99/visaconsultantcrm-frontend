import React, { useEffect, useState } from "react";
import { Outlet, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import {
  LogOut, ChevronDown, User, Menu, X,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import NotificationBell from "@/components/crm/NotificationBell";
import CrmSearch from "@/components/crm/CrmSearch";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  NAV_GROUPS,
  ROUTE_LABELS,
  isGroupActive,
  isChildActive,
  findGroupIdForPath,
  childNavLabel,
} from "./crmNavConfig";

const GROUPS_STORAGE_KEY = "crm_sidebar_groups";

function loadOpenGroups(pathname) {
  let stored = {};
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) || {};
  } catch { /* ignore */ }
  const activeId = findGroupIdForPath(pathname);
  if (activeId) stored[activeId] = true;
  return stored;
}

function persistOpenGroups(next) {
  try { localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

/**
 * CRM layout — Premium Glass at comfortable density.
 * Gradient navy sidebar, warm ivory content area.
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
  const [openGroups, setOpenGroups] = useState(() => loadOpenGroups(location.pathname));

  useEffect(() => {
    const activeId = findGroupIdForPath(location.pathname);
    if (!activeId) return;
    setOpenGroups((prev) => {
      if (prev[activeId]) return prev;
      const next = { ...prev, [activeId]: true };
      persistOpenGroups(next);
      return next;
    });
  }, [location.pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("crm_sidebar_collapsed", String(next)); } catch {}
      return next;
    });
    setHoverExpanded(false);
  };

  const setGroupOpen = (groupId, open) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: open };
      persistOpenGroups(next);
      return next;
    });
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
    : ROUTE_LABELS[location.pathname]
      ?? (pathParts.length === 2 && pathParts[0] === "cases"
        ? `Case #${pathParts[1].slice(0, 8)}`
        : pathParts.length === 2 && pathParts[0] === "clients"
          ? "Client"
          : pathParts.length === 2 && pathParts[0] === "passport-products"
          ? "Passport product"
          : pathParts[0] === "tasks" && user?.role === "admin"
            ? "Tasks"
            : ROUTE_LABELS[`/${pathParts[0]}`] ?? pathParts[0]);

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

  const visibleGroups = NAV_GROUPS.filter((group) => !group.adminOnly || user?.role === "admin");

  const sidebarContent = (forceFull = false) => {
    const showLabels = forceFull || isExpanded;

    return (
      <>
        {/* Logo area */}
        <div className={cn(
          "shrink-0 border-b border-[rgba(255,252,247,0.08)] flex items-center gap-3",
          showLabels ? "px-4 py-4 justify-between" : "px-2.5 py-4 justify-center"
        )}>
          <Link to="/" className={cn("flex items-center min-w-0", showLabels ? "gap-3" : "gap-0")} data-testid="crm-logo">
            {showLabels ? (
              <div className="min-w-0 transition-opacity duration-200">
                <AmaraVisaLogo size="sm" invert className="opacity-95 max-w-[150px]" />
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[rgba(255,252,247,0.3)] mt-1">Ops desk</div>
              </div>
            ) : (
              <AmaraVisaLogo size="sm" invert className="opacity-95 max-w-[36px] overflow-hidden" />
            )}
          </Link>
          {/* Close button for mobile only */}
          {forceFull && (
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg text-[rgba(255,252,247,0.6)] hover:bg-[rgba(255,252,247,0.05)] transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              data-testid="crm-sidebar-close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation — scrolls independently of the page */}
        <nav className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain",
          "[scrollbar-color:rgba(255,252,247,0.22)_transparent]",
          showLabels ? "p-2.5 space-y-0.5" : "p-2 space-y-0.5"
        )}>
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = isGroupActive(group, location.pathname);
            return (
              <NavGroup
                key={group.id}
                label={group.label}
                icon={<GroupIcon className="w-[18px] h-[18px]" />}
                testId={group.testid}
                open={!!openGroups[group.id]}
                onOpenChange={(open) => setGroupOpen(group.id, open)}
                active={groupActive}
                collapsedOnly={!showLabels}
                collapsedTo={group.children[0]?.to || "/"}
              >
                {group.children.map((child) => {
                  const ChildIcon = child.icon;
                  return (
                    <RailSubLink
                      key={child.to}
                      child={child}
                      label={childNavLabel(child, user?.role)}
                      icon={<ChildIcon className="w-4 h-4" />}
                      showLabel={showLabels}
                    />
                  );
                })}
              </NavGroup>
            );
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        {!forceFull && (
          <div className="hidden lg:block shrink-0 px-2.5 py-2 border-t border-[rgba(255,252,247,0.08)]">
            <button
              type="button"
              onClick={toggleCollapse}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs",
                "text-[rgba(255,252,247,0.45)] hover:text-[rgba(255,252,247,0.8)] hover:bg-[rgba(255,252,247,0.05)] transition-all duration-200",
                !showLabels && "justify-center"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              data-testid="crm-sidebar-collapse-toggle"
            >
              {collapsed ? <ChevronsRight className="w-[18px] h-[18px] shrink-0" /> : <ChevronsLeft className="w-[18px] h-[18px] shrink-0" />}
              {showLabels && <span className="font-medium">{collapsed ? "Expand" : "Collapse"}</span>}
            </button>
          </div>
        )}

        {/* Profile section */}
        <div className={cn("shrink-0 border-t border-[rgba(255,252,247,0.08)]", showLabels ? "p-2.5" : "p-2")}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                "w-full flex items-center rounded-lg text-left",
                "hover:bg-[rgba(255,252,247,0.05)] transition-all duration-200",
                showLabels ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"
              )}
              data-testid="crm-profile-trigger"
            >
              <span className={cn(
                "rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                "bg-gradient-to-br from-[rgba(47,107,90,0.6)] to-[rgba(31,74,58,0.4)] text-[rgba(255,252,247,0.95)]",
                "border border-[rgba(255,252,247,0.12)] shadow-sm",
                showLabels ? "w-8 h-8" : "w-9 h-9"
              )}>
                {initials}
              </span>
              {showLabels && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[rgba(255,252,247,0.95)] truncate">{user?.full_name}</div>
                    <div className="text-[10px] font-mono uppercase text-[rgba(255,252,247,0.3)] tracking-wider">{user?.role}</div>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-[rgba(255,252,247,0.35)] shrink-0 transition-transform duration-200", profileOpen && "rotate-180")} />
                </>
              )}
            </button>

            {profileOpen && (
              <div className={cn(
                "absolute bottom-full left-0 right-0 mb-1.5 rounded-xl overflow-hidden",
                "bg-[#1a3d2e] border border-[rgba(255,252,247,0.1)]",
                "shadow-[0_-4px_24px_rgba(0,0,0,0.35)]",
              )}>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-[rgba(255,252,247,0.75)] hover:bg-[rgba(255,252,247,0.05)] transition-colors"
                  data-testid="crm-nav-profile"
                >
                  <User className="w-4 h-4" />
                  Profile &amp; settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[rgba(155,61,50,0.85)] hover:bg-[rgba(155,61,50,0.08)] transition-colors"
                  data-testid="crm-logout"
                >
                  <LogOut className="w-4 h-4" />
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
    <div className="crm-shell h-full max-h-screen overflow-hidden text-ink font-sans flex" style={{ background: "var(--surface)" }}>
      {/* Desktop sidebar — collapsible, pinned to viewport */}
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col h-full overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] relative",
          collapsed && !hoverExpanded ? "w-[72px]" : "w-[260px]",
        )}
        style={{ background: "var(--gradient-sidebar)" }}
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
      >
        {/* Glossy overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(47,107,90,0.15),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_40%_40%_at_80%_90%,rgba(176,141,87,0.05),transparent_50%)]" />

        {/* When hover-expanded over a collapsed sidebar, show an elevated overlay */}
        {collapsed && hoverExpanded ? (
          <div
            className="absolute inset-y-0 left-0 w-[260px] z-50 flex flex-col min-h-0 overflow-hidden shadow-[var(--shadow-sidebar)]"
            style={{ background: "var(--gradient-sidebar)" }}
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(47,107,90,0.15),transparent_60%)]" />
            <div className="relative flex flex-col h-full min-h-0">
              {sidebarContent(false)}
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col h-full min-h-0">
            {sidebarContent(false)}
          </div>
        )}
      </aside>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="crm-sidebar-overlay"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col overflow-hidden transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "var(--gradient-sidebar)" }}
        data-testid="crm-sidebar-drawer"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(47,107,90,0.15),transparent_60%)]" />
        <div className="relative flex flex-col h-full min-h-0">
          {sidebarContent(true)}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Topbar — glass panel */}
        <div className={cn(
          "shrink-0 z-30 h-14 flex items-center justify-between gap-4 px-5",
          "glass-topbar border-b border-border/60",
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg border border-border text-ink-muted hover:text-ink hover:bg-surface-muted transition-all duration-200"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              data-testid="crm-sidebar-toggle"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm text-ink-muted min-w-0">
              <span className="text-ink-muted/40 font-medium">AmaraVisa</span>
              <span className="text-border-strong">/</span>
              <span className="text-ink font-semibold truncate">{breadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <CrmSearch />
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ background: "var(--gradient-surface)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  label, icon, children, testId, open, onOpenChange, active, collapsedOnly, collapsedTo,
}) {
  if (collapsedOnly) {
    return (
      <NavLink
        to={collapsedTo || "/"}
        data-testid={testId}
        title={label}
        className={() =>
          cn(
            "relative flex items-center justify-center rounded-lg px-2 py-3 text-[13px] font-semibold transition-all duration-200",
            active
              ? "bg-[rgba(255,252,247,0.08)] text-[rgba(255,252,247,0.96)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-gold before:to-gold-light"
              : "text-[rgba(255,252,247,0.55)] hover:bg-[rgba(255,252,247,0.05)] hover:text-[rgba(255,252,247,0.85)]",
          )
        }
      >
        <span className="shrink-0">{icon}</span>
      </NavLink>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <CollapsibleTrigger
        className={cn(
          "w-full relative flex items-center rounded-lg text-[13px] font-semibold transition-all duration-200",
          "gap-3 px-3 py-2.5",
          active
            ? "bg-[rgba(255,252,247,0.06)] text-[rgba(255,252,247,0.96)]"
            : "text-[rgba(255,252,247,0.55)] hover:bg-[rgba(255,252,247,0.05)] hover:text-[rgba(255,252,247,0.85)]",
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-50", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5 space-y-0.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function RailSubLink({ child, icon, label, showLabel = true }) {
  const location = useLocation();
  const active = isChildActive(child, location.pathname);
  return (
    <NavLink
      to={child.to}
      end={child.end}
      data-testid={child.testid}
      className={cn(
        "relative flex items-center rounded-lg text-[12px] font-medium transition-all duration-200",
        showLabel ? "gap-2.5 pl-8 pr-3 py-2" : "justify-center px-2 py-2.5",
        active
          ? "bg-[rgba(255,252,247,0.08)] text-[rgba(255,252,247,0.96)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-gold before:to-gold-light"
          : "text-[rgba(255,252,247,0.5)] hover:bg-[rgba(255,252,247,0.04)] hover:text-[rgba(255,252,247,0.85)]",
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      {showLabel && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
