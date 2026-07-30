"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Home, LogOut, UserRound, X, Menu, ChevronRight,
  Search, ShieldCheck, Compass,
} from "lucide-react";
import { clearSession, getUser } from "@/lib/session";
import { SUPPORT, cn } from "@/lib/utils";
import NotificationBell from "@/components/customer/notification-bell";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { useCatalogSearch } from "@/context/catalog-search";
import { track } from "@/lib/telemetry";

export default function CustomerShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const catalogSearch = useCatalogSearch();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const customer = Boolean(user?.role === "customer");

  const logout = () => {
    clearSession();
    track("logout");
    setUser(null);
    router.push("/");
  };

  const isActive = (href, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-white text-ink font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 bg-navy text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 bg-white transition-shadow duration-300",
          scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_20px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3.5 flex items-center gap-3 md:gap-6">
          {/* Logo + guarantee badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" data-testid="brand-logo" className="flex items-center group">
              <AmaraVisaLogo size="md" priority className="transition-opacity group-hover:opacity-90" />
            </Link>
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-surface-muted/40">
              <ShieldCheck className="w-3.5 h-3.5 text-teal" />
              <span className="text-[11px] font-medium text-ink-muted whitespace-nowrap">
                Visas On Time Guaranteed
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            <HeaderTab
              href="/"
              active={isActive("/", true)}
              label="Explore"
              icon={<Compass className="w-4 h-4" />}
              testid="nav-catalog"
            />
            {customer && (
              <HeaderTab
                href="/account"
                active={isActive("/account")}
                label="My Applications"
                icon={<Briefcase className="w-4 h-4" />}
                testid="nav-account"
              />
            )}
          </nav>

          {/* Header search — home only */}
          {isHome && catalogSearch && (
            <div className="flex-1 hidden sm:flex max-w-md mx-auto">
              <div className="atlys-search w-full">
                <Search className="w-4 h-4 text-ink-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Search Country"
                  value={catalogSearch.q}
                  onChange={(e) => catalogSearch.setQ(e.target.value)}
                  data-testid="hero-search"
                  className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted/70"
                />
              </div>
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
            {customer ? (
              <>
                <NotificationBell />
                <Link
                  href="/account"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-surface-muted text-navy hover:bg-navy/10 transition-colors"
                  data-testid="nav-user"
                  aria-label="Account"
                >
                  {user?.full_name?.[0]?.toUpperCase() || <UserRound className="w-4 h-4" />}
                </Link>
                <button
                  onClick={logout}
                  className="hidden sm:flex p-2 text-ink-muted hover:text-danger rounded-full transition-all"
                  data-testid="nav-logout"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-muted text-ink-muted hover:text-navy hover:bg-navy/8 transition-colors"
                data-testid="nav-signin"
                aria-label="Sign in"
              >
                <UserRound className="w-4 h-4" />
              </Link>
            )}

            <button
              className="md:hidden p-2 rounded-full hover:bg-surface-muted transition-colors text-ink-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search on home */}
        {isHome && catalogSearch && (
          <div className="sm:hidden px-4 pb-3">
            <div className="atlys-search w-full">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                type="text"
                placeholder="Search Country"
                value={catalogSearch.q}
                onChange={(e) => catalogSearch.setQ(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted/70"
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-border/60 bg-white"
            >
              <div className="px-4 py-4 space-y-1">
                <MobileNavLink href="/" label="Explore" icon={<Home className="w-4 h-4" />} active={isActive("/", true)} />
                {customer && (
                  <MobileNavLink href="/account" label="My Applications" icon={<Briefcase className="w-4 h-4" />} active={isActive("/account")} />
                )}
                {customer ? (
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm text-danger hover:bg-danger/6 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl text-sm text-navy font-medium hover:bg-navy/6 transition-colors"
                    data-testid="mobile-signin"
                  >
                    <UserRound className="w-4 h-4" />
                    Sign in
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-ink-muted" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <motion.main
        id="main"
        className="pb-mobile-nav md:pb-0"
        key={pathname}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.main>

      <footer className="mt-16 border-t border-border/60 bg-navy-deep">
        <FooterContent />
      </footer>

      <nav
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
        aria-label="Mobile navigation"
      >
        <div className="atlys-fab">
          <MobileBottomLink
            href="/"
            icon={<Compass className="w-4 h-4" />}
            active={pathname === "/"}
            testid="mobile-nav-visas"
          />
          <div className="w-px h-5 bg-border/80" />
          <MobileBottomLink
            href={customer ? "/account" : "/auth"}
            icon={<Briefcase className="w-4 h-4" />}
            active={pathname.startsWith("/account") || pathname.startsWith("/status")}
            testid="mobile-nav-apps"
          />
        </div>
      </nav>
    </div>
  );
}

function HeaderTab({ href, active, label, icon, testid }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {icon}
      {label}
      {active && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ink" />
      )}
    </Link>
  );
}

function FooterContent() {
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-4">
            <AmaraVisaLogo size="md" invert className="opacity-95" />
          </div>
          <p className="text-sm text-surface-muted/70 leading-relaxed max-w-[220px]">
            Premium visa consultancy for Indian passport holders. Transparent fees, expert review, on-time guarantee.
          </p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-4">Popular</div>
          <ul className="space-y-2.5 text-sm">
            {["Singapore", "United Arab Emirates", "United Kingdom", "Australia", "Thailand"].map((c) => (
              <li key={c}>
                <Link href="/" className="text-surface-muted/70 hover:text-gold transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-4">Support</div>
          <ul className="space-y-2.5">
            <li>
              <a href={`mailto:${SUPPORT.email}`} className="text-sm text-surface-muted/70 hover:text-gold transition-colors">
                {SUPPORT.email}
              </a>
            </li>
            <li>
              <a href={`tel:${SUPPORT.phone}`} className="text-sm text-surface-muted/70 hover:text-gold transition-colors">
                {SUPPORT.phone}
              </a>
            </li>
            <li>
              <a href={SUPPORT.whatsapp} target="_blank" rel="noreferrer" className="text-sm text-surface-muted/70 hover:text-gold transition-colors">
                WhatsApp support
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-4">Company</div>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="text-surface-muted/70 hover:text-gold transition-colors">All destinations</Link></li>
            <li><Link href="/auth" className="text-surface-muted/70 hover:text-gold transition-colors">Sign in</Link></li>
            <li>
              <a href={SUPPORT.crmUrl} className="text-surface-muted/70 hover:text-gold transition-colors" data-testid="footer-crm-link">
                Consultant login
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-surface-muted/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-surface-muted/40 text-center sm:text-left">
          © 2026 AmaraVisa India Private Limited
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold/60" />
          <span className="text-[10px] font-mono text-surface-muted/35 uppercase tracking-widest">On-time guarantee</span>
        </div>
      </div>
    </div>
  );
}

function MobileNavLink({ href, label, icon, active }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-colors",
        active ? "bg-navy/8 text-navy font-medium" : "text-ink-muted hover:text-ink hover:bg-surface-muted",
      )}
    >
      {icon}
      {label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-navy/40" />}
    </Link>
  );
}

function MobileBottomLink({ href, icon, active, testid }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={cn(
        "p-2.5 rounded-full transition-colors",
        active ? "text-navy bg-navy/8" : "text-ink-muted hover:text-ink",
      )}
    >
      {icon}
    </Link>
  );
}
