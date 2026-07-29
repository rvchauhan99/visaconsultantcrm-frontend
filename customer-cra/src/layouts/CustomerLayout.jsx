import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "@/lib/api";
import { UserRound, LogOut } from "lucide-react";
import NotificationBell from "@/components/customer/NotificationBell";

/**
 * Customer platform layout — calm, trust-forward, generous whitespace.
 */
export default function CustomerLayout() {
    const user = getUser();
    const isCustomer = user?.role === "customer";
    const nav = useNavigate();

    const logout = () => {
        clearSession();
        nav("/");
    };

    return (
        <div className="min-h-screen bg-surface text-ink font-sans">
            <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-border">
                <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                    <Link to="/" data-testid="brand-logo" className="flex items-center gap-2.5 group">
                        <img
                          src={`${process.env.PUBLIC_URL || ""}/brand/amaravisa-logo.png`}
                          alt="amaravisa"
                          className="h-8 w-auto object-contain"
                        />
                        <span className="hidden sm:inline text-xs uppercase tracking-[0.22em] text-ink-muted ml-1">Visa Consultancy</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 text-sm">
                        <NavLink to="/" end className={({ isActive }) => `${isActive ? "text-navy" : "text-ink-muted hover:text-ink"} transition-colors`} data-testid="nav-catalog">Visas</NavLink>
                        {isCustomer && (
                            <NavLink to="/account" className={({ isActive }) => `${isActive ? "text-navy" : "text-ink-muted hover:text-ink"} transition-colors`} data-testid="nav-account">My applications</NavLink>
                        )}
                    </nav>

                    <div className="flex items-center gap-3">
                        {isCustomer ? (
                            <>
                                <NotificationBell />
                                <Link to="/account" className="hidden sm:flex items-center gap-2 text-sm text-ink-muted hover:text-ink" data-testid="nav-user">
                                    <UserRound className="w-4 h-4" />
                                    {user.full_name}
                                </Link>
                                <button onClick={logout} className="p-2 text-ink-muted hover:text-ink" data-testid="nav-logout" aria-label="Sign out">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <Link to="/auth" className="text-sm px-4 py-2 border border-ink text-ink rounded-full hover:bg-ink hover:text-white transition-colors" data-testid="nav-signin">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main>
                <Outlet />
            </main>

            <footer className="mt-24 border-t border-border">
                <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid md:grid-cols-3 gap-8 text-sm text-ink-muted">
                    <div>
                        <div className="font-display text-navy text-lg mb-2">AmaraVisa</div>
                        <p className="max-w-xs leading-relaxed">Visa guidance for Indian passport holders. Real people, careful review, on time — or we make it right.</p>
                    </div>
                    <div>
                        <div className="uppercase tracking-[0.18em] text-xs mb-3">Trust</div>
                        <ul className="space-y-1.5">
                            <li>Transparent government + service fees</li>
                            <li>Documents encrypted, private by default</li>
                            <li>Human consultant per case</li>
                        </ul>
                    </div>
                    <div>
                        <div className="uppercase tracking-[0.18em] text-xs mb-3">Staff</div>
                        <a
                            href={process.env.REACT_APP_CRM_URL || "http://localhost:3001/login"}
                            className="hover:text-ink"
                            data-testid="footer-crm-link"
                        >
                            Consultant sign-in →
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
