"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Home, LogOut, UserRound, X, Menu, ChevronRight,
  Search, ShieldCheck,
} from "lucide-react";
import { clearSession, getUser } from "@/lib/session";
import { signOutCustomer } from "@/lib/firebase";
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

  const logout = async () => {
    await signOutCustomer();
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
          "sticky top-0 z-40 bg-white border-b border-transparent transition-[box-shadow,border-color] duration-300",
          scrolled && "border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]",
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-4">
          {/* Left: logo + guarantee */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0 justify-self-start">
            <Link href="/" data-testid="brand-logo" className="flex items-center group shrink-0">
              <AmaraVisaLogo size="xl" priority className="transition-opacity group-hover:opacity-90" />
            </Link>
            <div className="hidden md:block w-px h-8 bg-border shrink-0" aria-hidden />
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white">
                <ShieldCheck className="w-4 h-4 text-ink" strokeWidth={2} />
              </span>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-ink underline underline-offset-2 decoration-ink/80 whitespace-nowrap">
                  Visas On Time
                </div>
                <div className="text-[12px] font-medium text-ink whitespace-nowrap">Guaranteed</div>
              </div>
            </div>
          </div>

          {/* Center: Explore only (no Events) */}
          <nav className="hidden md:flex items-center justify-center justify-self-center">
            <Link
              href="/"
              data-testid="nav-catalog"
              aria-label="Explore visas"
              aria-current={isActive("/", true) ? "page" : undefined}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                "bg-[#f3f3f3] hover:bg-[#ebebeb]",
                isActive("/", true) && "ring-1 ring-black/10",
              )}
            >
              <Image
                src="/brand/explore-icon.png"
                alt=""
                width={30}
                height={30}
                className="w-[30px] h-[30px] object-contain drop-shadow-sm"
                aria-hidden
              />
              {isActive("/", true) && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-ink" />
              )}
            </Link>
          </nav>

          {/* Right: search + India flag + profile */}
          <div className="flex items-center gap-2 sm:gap-3 justify-self-end min-w-0">
            {isHome && catalogSearch && (
              <div className="hidden sm:block w-[min(100%,18rem)] md:w-[min(100%,20rem)] lg:w-[22rem]">
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

            <div
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-base leading-none select-none"
              title="India"
              aria-label="Indian passport"
              role="img"
            >
              🇮🇳
            </div>

            {customer && <NotificationBell />}

            {customer ? (
              <Link
                href="/account"
                className="h-9 w-9 rounded-full border border-border bg-white flex items-center justify-center text-xs font-bold text-ink hover:bg-[#f7f7f7] transition-colors"
                data-testid="nav-user"
                aria-label="Account"
              >
                {user?.full_name?.[0]?.toUpperCase() || <UserRound className="w-4 h-4 text-ink-muted" />}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="h-9 w-9 rounded-full border border-border bg-white flex items-center justify-center text-ink-muted hover:text-ink hover:bg-[#f7f7f7] transition-colors"
                data-testid="nav-signin"
                aria-label="Sign in"
              >
                <UserRound className="w-4 h-4" />
              </Link>
            )}

            <button
              className="md:hidden p-2 rounded-full hover:bg-[#f3f3f3] transition-colors text-ink-muted"
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
                    data-testid="nav-logout"
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
            icon={
              <Image
                src="/brand/explore-icon.png"
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
                aria-hidden
              />
            }
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

function FooterContent() {
  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 pt-12 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-4">
            <AmaraVisaLogo size="md" invert />
          </div>
          <p className="text-sm text-white leading-relaxed max-w-[220px]">
            Premium visa consultancy for Indian passport holders. Transparent fees, expert review, on-time guarantee.
          </p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white font-mono mb-4">Popular</div>
          <ul className="space-y-2.5 text-sm">
            {["Singapore", "United Arab Emirates", "United Kingdom", "Australia", "Thailand"].map((c) => (
              <li key={c}>
                <Link href="/" className="text-white hover:text-white/80 transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white font-mono mb-4">Support</div>
          <ul className="space-y-2.5">
            <li>
              <a href={`mailto:${SUPPORT.email}`} className="text-sm text-white hover:text-white/80 transition-colors">
                {SUPPORT.email}
              </a>
            </li>
            <li>
              <a href={`tel:${SUPPORT.phone}`} className="text-sm text-white hover:text-white/80 transition-colors">
                {SUPPORT.phone}
              </a>
            </li>
            <li>
              <a href={SUPPORT.whatsapp} target="_blank" rel="noreferrer" className="text-sm text-white hover:text-white/80 transition-colors">
                WhatsApp support
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white font-mono mb-4">Company</div>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="text-white hover:text-white/80 transition-colors">All destinations</Link></li>
            <li><Link href="/auth" className="text-white hover:text-white/80 transition-colors">Sign in</Link></li>
            <li>
              <a href={SUPPORT.crmUrl} className="text-white hover:text-white/80 transition-colors" data-testid="footer-crm-link">
                Consultant login
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-white text-center sm:text-left">
          © 2026 AmaraVisa India Private Limited
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="text-[10px] font-mono text-white uppercase tracking-widest">On-time guarantee</span>
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
