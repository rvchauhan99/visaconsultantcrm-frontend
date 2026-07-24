import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import { LogOut, KanbanSquare, Layers, Users2, BarChart3, PlusSquare, LayoutGrid, StampIcon, FileText, FormInput, ListChecks } from "lucide-react";
import NotificationBell from "@/components/crm/NotificationBell";
import CrmSearch from "@/components/crm/CrmSearch";

/**
 * CRM layout — Editorial Luxe at compact density.
 * Sans only (no display font). Bottle-green navy accents, paper surfaces.
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
            <aside className="w-56 shrink-0 bg-surface-card border-r border-border flex flex-col">
                <div className="px-3 py-3 border-b border-border">
                    <Link to="/" className="flex items-center gap-2.5" data-testid="crm-logo">
                        <span className="inline-flex w-8 h-8 items-center justify-center rounded-sm border-2 border-double border-navy text-navy text-[10px] font-mono font-semibold bg-surface">
                            PC
                        </span>
                        <div>
                            <div className="text-sm font-semibold leading-tight text-navy">Passage CRM</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">Ops desk</div>
                        </div>
                    </Link>
                </div>
                <nav className="p-1.5 flex flex-col gap-0.5 text-sm">
                    <RailLink to="/" icon={<LayoutGrid className="w-4 h-4" />} label="Dashboard" testid="crm-nav-dashboard" end />
                    <RailLink to="/pipeline" icon={<KanbanSquare className="w-4 h-4" />} label="Pipeline" testid="crm-nav-pipeline" />
                    <RailLink to="/tasks" icon={<ListChecks className="w-4 h-4" />} label="My tasks" testid="crm-nav-tasks" />
                    <RailLink to="/passport-expiry" icon={<StampIcon className="w-4 h-4" />} label="Passport expiry" testid="crm-nav-expiry" />
                    <RailLink to="/offline-case" icon={<PlusSquare className="w-4 h-4" />} label="New offline case" testid="crm-nav-offline" />
                    <RailLink to="/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports" testid="crm-nav-reports" />
                    {user?.role === "admin" && (
                        <>
                            <div className="mt-3 px-2 text-[10px] uppercase font-mono tracking-widest text-ink-muted">Admin</div>
                            <RailLink to="/products" icon={<Layers className="w-4 h-4" />} label="Visa products" testid="crm-nav-products" />
                            <RailLink to="/document-master" icon={<FileText className="w-4 h-4" />} label="Document master" testid="crm-nav-doc-master" />
                            <RailLink to="/field-master" icon={<FormInput className="w-4 h-4" />} label="Field master" testid="crm-nav-field-master" />
                            <RailLink to="/consultants" icon={<Users2 className="w-4 h-4" />} label="Consultants" testid="crm-nav-consultants" />
                        </>
                    )}
                </nav>

                <div className="mt-auto p-2.5 border-t border-border bg-surface/40">
                    <Link
                        to="/profile"
                        className="block rounded-sm hover:bg-surface-muted -mx-0.5 px-1.5 py-1.5 mb-1"
                        data-testid="crm-nav-profile"
                    >
                        <div className="text-xs font-medium text-ink truncate">{user?.full_name}</div>
                        <div className="text-[10px] font-mono uppercase text-ink-muted">Profile · {user?.role}</div>
                    </Link>
                    <button onClick={logout} className="text-xs flex items-center gap-1.5 text-ink-muted hover:text-ink px-1.5 py-1" data-testid="crm-logout">
                        <LogOut className="w-3 h-3" /> Sign out
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 overflow-x-auto">
                <div className="sticky top-0 z-30 bg-surface-card/95 backdrop-blur border-b border-border px-3 py-1.5 flex items-center justify-between gap-2">
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
                `relative flex items-center gap-2.5 px-2 py-1.5 rounded-sm transition-colors ${
                    isActive
                        ? "bg-surface-muted text-navy font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-navy"
                        : "text-ink-muted hover:bg-surface-muted/70 hover:text-ink"
                }`
            }
        >
            {icon} <span>{label}</span>
        </NavLink>
    );
}
