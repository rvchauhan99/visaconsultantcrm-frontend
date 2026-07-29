"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Briefcase, Home, LogOut, UserRound, X, Menu, ChevronRight } from "lucide-react";
import { clearSession, getUser } from "@/lib/session";
import { SUPPORT, cn } from "@/lib/utils";
import NotificationBell from "@/components/customer/notification-bell";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import { track } from "@/lib/telemetry";

export default function CustomerShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
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
    <div className="min-h-screen bg-surface text-ink font-sans">
      {/* ── Skip link ── */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 bg-navy text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg"
      >
        Skip to content
      </a>

      {/* ════════════════════════════════
          HEADER
      ════════════════════════════════ */}
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled
            ? "bg-[var(--glass)] backdrop-blur-2xl border-b border-[var(--glass-border)] shadow-[0_4px_24px_rgba(28,20,16,0.06)]"
            : "bg-surface/80 backdrop-blur-md border-b border-transparent",
        )}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3.5 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" data-testid="brand-logo" className="flex items-center gap-2.5 group shrink-0">
            <AmaraVisaLogo size="md" priority className="transition-opacity group-hover:opacity-90" />
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.26em] text-ink-muted">
              Visa consultancy
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/" active={isActive("/", true)} label="Destinations" testid="nav-catalog" />
            {customer && (
              <NavLink href="/account" active={isActive("/account")} label="My Applications" testid="nav-account" />
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {customer ? (
              <>
                <NotificationBell />
                <Link
                  href="/account"
                  className="hidden sm:flex items-center gap-2.5 text-sm text-ink-muted hover:text-ink transition-colors"
                  data-testid="nav-user"
                >
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    "bg-gradient-to-br from-navy to-teal text-white",
                    "shadow-[var(--shadow-card)]",
                  )}>
                    {user?.full_name?.[0]?.toUpperCase() || <UserRound className="w-3.5 h-3.5" />}
                  </span>
                  <span className="max-w-[9rem] truncate font-medium">{user?.full_name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-ink-muted hover:text-danger hover:bg-danger/8 rounded-full transition-all"
                  data-testid="nav-logout"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className={cn(
                  "text-sm px-5 py-2.5 rounded-full font-medium",
                  "bg-gradient-to-r from-navy via-teal to-navy bg-[length:200%_100%]",
                  "text-white shadow-[0_4px_14px_var(--glow-navy)]",
                  "hover:bg-right hover:shadow-[0_6px_22px_var(--glow-navy)] hover:-translate-y-px",
                  "transition-all duration-300",
                )}
                data-testid="nav-signin"
              >
                Sign in
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-surface-muted transition-colors text-ink-muted hover:text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-border/60 bg-[var(--glass)] backdrop-blur-2xl"
            >
              <div className="px-5 py-4 space-y-1">
                <MobileNavLink href="/" label="Destinations" icon={<Home className="w-4 h-4" />} active={isActive("/", true)} />
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

      {/* ════════════════════════════════
          MAIN
      ════════════════════════════════ */}
      <motion.main
        id="main"
        className="pb-mobile-nav md:pb-0"
        key={pathname}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>

      {/* ════════════════════════════════
          FOOTER
      ════════════════════════════════ */}
      <footer className="mt-24 md:mt-32 border-t border-border/60 bg-navy-deep hidden md:block">
        <div className="max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-10 grid md:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <AmaraVisaLogo size="md" invert className="opacity-95" />
            </div>
            <p className="text-sm text-surface-muted/70 leading-relaxed max-w-[200px]">
              A quieter way to travel papers. Human consultants, transparent fees, a case journey you can feel.
            </p>
          </div>

          {/* Trust */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-5">Trust</div>
            <ul className="space-y-3 text-sm text-surface-muted/70 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-gold/70 mt-0.5">—</span>
                Transparent government + service fees
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold/70 mt-0.5">—</span>
                Documents encrypted, private by default
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold/70 mt-0.5">—</span>
                Dedicated consultant per case
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-5">Support</div>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${SUPPORT.email}`}
                  className="text-sm text-surface-muted/70 hover:text-gold transition-colors"
                  onClick={() => track("support_click", { channel: "email", source: "footer" })}
                >
                  {SUPPORT.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SUPPORT.phone}`}
                  className="text-sm text-surface-muted/70 hover:text-gold transition-colors"
                  onClick={() => track("support_click", { channel: "phone", source: "footer" })}
                >
                  {SUPPORT.phone}
                </a>
              </li>
              <li>
                <a
                  href={SUPPORT.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-surface-muted/70 hover:text-gold transition-colors inline-flex items-center gap-1"
                  onClick={() => track("support_click", { channel: "whatsapp", source: "footer" })}
                >
                  WhatsApp atelier →
                </a>
              </li>
            </ul>
          </div>

          {/* Staff */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-surface-muted/50 font-mono mb-5">Staff</div>
            <a
              href={SUPPORT.crmUrl}
              className="text-sm text-surface-muted/70 hover:text-gold transition-colors inline-flex items-center gap-1"
              data-testid="footer-crm-link"
            >
              Consultant sign-in →
            </a>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-surface-muted/10 px-5 md:px-10 py-4 max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-widest text-surface-muted/40">
            © AmaraVisa · Indian passport holders
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-pulse" />
            <span className="text-[10px] font-mono text-surface-muted/35 uppercase tracking-widest">Since 2019</span>
          </div>
        </div>
      </footer>

      {/* Mobile footer — minimal */}
      <div className="md:hidden border-t border-border/60 bg-navy-deep px-5 py-6 text-center mt-8 mb-16">
        <p className="text-[11px] font-mono uppercase tracking-widest text-surface-muted/40">
          © AmaraVisa · Indian passport holders
        </p>
      </div>

      {/* ════════════════════════════════
          MOBILE BOTTOM NAV — floating pill
      ════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-xs"
        aria-label="Mobile navigation"
      >
        <div className="bg-[var(--glass)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-full shadow-[var(--shadow-lift)] px-2 py-2 flex items-center justify-around">
          <MobileBottomLink
            href="/"
            label="Explore"
            icon={<Home className="w-5 h-5" />}
            active={pathname === "/"}
            testid="mobile-nav-visas"
          />
          <MobileBottomLink
            href={customer ? "/account" : "/auth"}
            label="Cases"
            icon={<Briefcase className="w-5 h-5" />}
            active={pathname.startsWith("/account") || pathname.startsWith("/status")}
            testid="mobile-nav-apps"
          />
          <MobileBottomLink
            href={customer ? "/account" : "/auth"}
            label={customer ? "Account" : "Sign in"}
            icon={<UserRound className="w-5 h-5" />}
            active={pathname.startsWith("/auth") || (customer && pathname === "/account")}
            testid="mobile-nav-account"
          />
        </div>
      </nav>
    </div>
  );
}

/* ────────────────────────────────────
   Desktop nav link
──────────────────────────────────── */
function NavLink({ href, active, label, testid }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={cn(
        "relative text-sm font-medium tracking-wide transition-colors duration-200",
        "after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:rounded-full",
        "after:bg-gradient-to-r after:from-navy after:to-teal",
        "after:transition-all after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)]",
        active
          ? "text-navy after:w-full"
          : "text-ink-muted hover:text-ink after:w-0 hover:after:w-full",
      )}
    >
      {label}
    </Link>
  );
}

/* ────────────────────────────────────
   Mobile slide-down menu link
──────────────────────────────────── */
function MobileNavLink({ href, label, icon, active }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-colors",
        active
          ? "bg-navy/8 text-navy font-medium"
          : "text-ink-muted hover:text-ink hover:bg-surface-muted",
      )}
    >
      {icon}
      {label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-navy/40" />}
    </Link>
  );
}

/* ────────────────────────────────────
   Mobile bottom pill nav link
──────────────────────────────────── */
function MobileBottomLink({ href, label, icon, active, testid }) {
  return (
    <Link
      href={href}
      data-testid={testid}
      className={cn(
        "flex flex-col items-center gap-1 px-5 py-2 rounded-full text-[10px] font-medium uppercase tracking-wide transition-all duration-200",
        active
          ? "bg-navy text-white shadow-[0_2px_12px_var(--glow-navy)]"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
