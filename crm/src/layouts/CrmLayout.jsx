import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import { LogOut, KanbanSquare, Layers, Users2, BarChart3, PlusSquare, LayoutGrid, StampIcon, FileText, FormInput, ListChecks } from "lucide-react";
import NotificationBell from "@/components/crm/NotificationBell";
import CrmSearch from "@/components/crm/CrmSearch";

/**
 * CRM layout — dense, functional, tighter spacing.
 * No Fraunces anywhere; IBM Plex Sans + Plex Mono for numbers/timestamps.
 */
export default function CrmLayout() {
    const user = getUser();
    const nav = useNavigate();
    const logout = () => {
        clearSession();
        nav("/login");
    };

    return (
        <div className="crm-shell min-h-screen bg-surface text-ink font-sans flex">
            {/* Rail nav */}
            <aside className="w-56 shrink-0 bg-white border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <Link to="/" className="flex items-center gap-2" data-testid="crm-logo">
                        <span className="inline-flex w-8 h-8 items-center justify-center rounded-sm border-2 border-double border-navy text-navy text-[10px] font-mono font-semibold">PC</span>
                        <div>
                            <div className="text-sm font-semibold leading-tight">Passage CRM</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">v1.0</div>
                        </div>
                    </Link>
                </div>
                <nav className="p-2 flex flex-col gap-0.5 text-sm">
                    <RailLink to="/" icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard" testid="crm-nav-dashboard" end />
                    <RailLink to="/pipeline" icon={<KanbanSquare className="w-4 h-4" />} label="Pipeline" testid="crm-nav-pipeline" />
                    <RailLink to="/tasks" icon={<ListChecks className="w-4 h-4" />} label="My tasks" testid="crm-nav-tasks" />
                    <RailLink to="/passport-expiry" icon={<StampIcon className="w-4 h-4" />} label="Passport expiry" testid="crm-nav-expiry" />
                    <RailLink to="/offline-case" icon={<PlusSquare className="w-4 h-4" />} label="New offline case" testid="crm-nav-offline" />
                    <RailLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" testid="crm-nav-reports" />
                    {user?.role === "admin" && (
                        <>
                            <div className="mt-4 px-2 text-[10px] uppercase font-mono tracking-widest text-ink-muted">Admin</div>
                            <RailLink to="/products" icon={<Layers className="w-4 h-4" />} label="Visa products" testid="crm-nav-products" />
                            <RailLink to="/document-master" icon={<FileText className="w-4 h-4" />} label="Document master" testid="crm-nav-doc-master" />
                            <RailLink to="/field-master" icon={<FormInput className="w-4 h-4" />} label="Field master" testid="crm-nav-field-master" />
                            <RailLink to="/consultants" icon={<Users2 className="w-4 h-4" />} label="Consultants" testid="crm-nav-consultants" />
                        </>
                    )}
                </nav>

                <div className="mt-auto p-3 border-t border-border">
                    <div className="text-xs font-medium">{user?.full_name}</div>
                    <div className="text-[10px] font-mono uppercase text-ink-muted mb-2">{user?.role}</div>
                    <button onClick={logout} className="text-xs flex items-center gap-1.5 text-ink-muted hover:text-ink" data-testid="crm-logout">
                        <LogOut className="w-3 h-3" /> Sign out
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 overflow-x-auto">
                {/* Top bar with search + the notification bell */}
                <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-between gap-2">
                    <CrmSearch />
                    <NotificationBell />
                </div>
                <Outlet />
            </main>
        </div>
    );
}

function RailLink({ to, icon, label, testid, end }) {
    return (
        <NavLink
            to={to}
            end={end}
            data-testid={testid}
            className={({ isActive }) =>
                `flex items-center gap-2.5 px-2 py-1.5 rounded-sm ${isActive ? "bg-surface text-navy font-medium" : "text-ink-muted hover:bg-surface hover:text-ink"}`
            }
        >
            {icon} <span>{label}</span>
        </NavLink>
    );
}
