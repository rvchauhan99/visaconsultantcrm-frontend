import React, { useState } from "react";
import { Outlet, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import {
  LogOut, KanbanSquare, Layers, Users2, BarChart3,
  PlusSquare, LayoutGrid, StampIcon, FileText, FormInput,
  ListChecks, ChevronDown, Settings, User,
} from "lucide-react";
import NotificationBell from "@/components/crm/NotificationBell";
import CrmSearch from "@/components/crm/CrmSearch";
import { cn } from "@/lib/utils";

const ROUTE_LABELS = {
  "/":               "Dashboard",
  "/pipeline":       "Pipeline",
  "/tasks":          "My tasks",
  "/passport-expiry":"Passport expiry",
  "/offline-case":   "New offline case",
  "/reports":        "Reports",
  "/products":       "Visa products",
  "/document-master":"Document master",
  "/field-master":   "Field master",
  "/consultants":    "Consultants",
  "/profile":        "Profile",
};

/**
 * CRM layout — Editorial Luxe at compact density.
 * Dark navy-deep sidebar, ivory content area.
 * Sans only — no display font.
 */
export default function CrmLayout() {
  const user = getUser();
  const nav = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const logout = () => {
    clearSession();
    nav("/login");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  /* Breadcrumb: find deepest matching route label */
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumb = pathParts.length === 0
    ? "Dashboard"
    : pathParts.length === 2 && pathParts[0] === "cases"
      ? `Case #${pathParts[1].slice(0, 8)}`
      : ROUTE_LABELS[`/${pathParts[0]}`] ?? pathParts[0];

  return (
    <div className="crm-shell min-h-screen text-ink font-sans flex" style={{ background: "var(--surface)" }}>
      {/* ════════════════════════════════
          SIDEBAR — dark navy-deep
      ════════════════════════════════ */}
      <aside className="w-[220px] shrink-0 flex flex-col" style={{ background: "var(--navy-deep, #0f2820)" }}>

        {/* Brand */}
        <div className="px-3 py-3.5 border-b border-navy-sidebar">
          <Link to="/" className="flex items-center gap-2.5" data-testid="crm-logo">
            <span className={cn(
              "inline-flex w-8 h-8 items-center justify-center rounded-md",
              "border border-double text-xs font-mono font-bold",
              "border-[rgba(176,141,87,0.5)] text-[rgba(176,141,87,0.85)]",
              "bg-[rgba(255,252,247,0.04)]",
            )}>
              PC
            </span>
            <div>
              <div className="text-sm font-semibold leading-tight text-navy-sidebar-active">Passage CRM</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[rgba(255,252,247,0.35)]">Ops desk</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <RailLink to="/" icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard" testid="crm-nav-dashboard" end />
          <RailLink to="/pipeline" icon={<KanbanSquare className="w-4 h-4" />} label="Pipeline" testid="crm-nav-pipeline" />
          <RailLink to="/tasks" icon={<ListChecks className="w-4 h-4" />} label="My tasks" testid="crm-nav-tasks" />
          <RailLink to="/passport-expiry" icon={<StampIcon className="w-4 h-4" />} label="Passport expiry" testid="crm-nav-expiry" />
          <RailLink to="/offline-case" icon={<PlusSquare className="w-4 h-4" />} label="New offline case" testid="crm-nav-offline" />
          <RailLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" testid="crm-nav-reports" />

          {user?.role === "admin" && (
            <>
              <div className="mt-4 mb-1 px-2 text-[9px] uppercase font-mono tracking-[0.2em] text-[rgba(255,252,247,0.3)]">
                Admin
              </div>
              <RailLink to="/products" icon={<Layers className="w-4 h-4" />} label="Visa products" testid="crm-nav-products" />
              <RailLink to="/document-master" icon={<FileText className="w-4 h-4" />} label="Document master" testid="crm-nav-doc-master" />
              <RailLink to="/field-master" icon={<FormInput className="w-4 h-4" />} label="Field master" testid="crm-nav-field-master" />
              <RailLink to="/consultants" icon={<Users2 className="w-4 h-4" />} label="Consultants" testid="crm-nav-consultants" />
            </>
          )}
        </nav>

        {/* User profile footer */}
        <div className="p-2 border-t border-navy-sidebar">
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left",
                "hover:bg-navy-sidebar-hover transition-colors",
              )}
              data-testid="crm-profile-trigger"
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                "bg-[rgba(47,107,90,0.5)] text-[rgba(255,252,247,0.9)] border border-[rgba(255,252,247,0.1)]",
              )}>
                {initials}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-navy-sidebar-active truncate">{user?.full_name}</div>
                <div className="text-[10px] font-mono uppercase text-[rgba(255,252,247,0.35)] capitalize">{user?.role}</div>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[rgba(255,252,247,0.4)] shrink-0 transition-transform", profileOpen && "rotate-180")} />
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
      </aside>

      {/* ════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className={cn(
          "sticky top-0 z-30 h-12 flex items-center justify-between gap-3 px-4",
          "bg-surface-card/95 backdrop-blur border-b border-border",
          "shadow-[0_1px_0_var(--border)]",
        )}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
            <span className="text-ink-muted/50">Passage</span>
            <span className="text-border-strong">/</span>
            <span className="text-ink font-medium truncate">{breadcrumb}</span>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-2 shrink-0">
            <CrmSearch />
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ────────────────────────────────────
   Sidebar nav link
──────────────────────────────────── */
function RailLink({ to, icon, label, testid, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testid}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150",
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
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
