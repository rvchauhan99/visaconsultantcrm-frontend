"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Home, LogOut, UserRound, X, Menu, ChevronRight,
  Search, ShieldCheck, Mail, Phone, MessageCircle,
} from "lucide-react";
import { clearSession, getUser } from "@/lib/session";
import { signOutCustomer } from "@/lib/firebase";
import { SUPPORT, cn } from "@/lib/utils";
import NotificationBell from "@/components/customer/notification-bell";
import AmaraVisaLogo from "@/components/brand/AmaraVisaLogo";
import CatalogFilters from "@/components/catalog/catalog-filters";
import { useCatalogSearch } from "@/context/catalog-search";
import { track } from "@/lib/telemetry";

const COMPACT_SCROLL_PX = 80;

export default function CustomerShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const reduce = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const isHome = pathname === "/";
  const catalog = useCatalogSearch();
  const compact = isHome && catalog.headerCompact;

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    if (!isHome) {
      catalog.setHeaderCompact(false);
      catalog.setSearchExpanded(false);
      return undefined;
    }

    const onScroll = () => {
      const next = window.scrollY > COMPACT_SCROLL_PX;
      catalog.setHeaderCompact(next);
      if (!next) catalog.setSearchExpanded(false);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // catalog setters are stable enough; avoid rebinding on every filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (catalog.searchExpanded) {
      const t = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
    return undefined;
  }, [catalog.searchExpanded]);

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[70] bg-navy text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "catalog-sticky-header sticky top-0 z-50",
          "transition-[box-shadow,border-color,background-color,backdrop-filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          compact
            ? "is-compact border-b border-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            : "border-b border-transparent",
        )}
        data-compact={compact ? "true" : "false"}
      >
        <div
          className={cn(
            "catalog-header-grid max-w-[1400px] mx-auto px-4 md:px-8",
            compact ? "catalog-header-grid--compact" : "catalog-header-grid--expanded",
          )}
        >
          {/* Left: logo + guarantee */}
          <div className="catalog-header-left flex items-center gap-3 md:gap-4 min-w-0">
            <Link href="/" data-testid="brand-logo" className="flex items-center group shrink-0">
              <AmaraVisaLogo
                size={compact ? "lg" : "xl"}
                priority
                className="transition-all duration-300 group-hover:opacity-90"
              />
            </Link>
            <div
              className={cn(
                "hidden md:block w-px bg-border shrink-0 transition-all duration-300",
                compact ? "h-7" : "h-8",
              )}
              aria-hidden
            />
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "flex items-center justify-center rounded-full border border-border bg-white transition-all duration-300",
                  compact ? "h-7 w-7" : "h-8 w-8",
                )}
              >
                <ShieldCheck className={cn("text-ink transition-all duration-300", compact ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={2} />
              </span>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold text-ink underline underline-offset-2 decoration-ink/80 whitespace-nowrap">
                  Visas On Time
                </div>
                <div className="text-[12px] font-medium text-ink whitespace-nowrap">Guaranteed</div>
              </div>
            </div>
          </div>

          {/* Center: passport (expanded) / filters (compact desktop) */}
          <div className="catalog-header-center flex items-center justify-center min-w-0">
            <div
              className={cn(
                "hidden md:flex items-center justify-center transition-all duration-300",
                compact ? "opacity-0 scale-95 pointer-events-none absolute w-0 h-0 overflow-hidden" : "opacity-100 scale-100",
              )}
              aria-hidden={compact}
            >
              <Link
                href="/"
                data-testid="nav-catalog"
                aria-label="Explore visas"
                aria-current={isActive("/", true) ? "page" : undefined}
                tabIndex={compact ? -1 : undefined}
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
            </div>

            {isHome && compact && (
              <div className="catalog-header-filters-inline hidden md:flex w-full min-w-0 opacity-100">
                <CatalogFilters compact className="w-full max-w-none" />
              </div>
            )}
          </div>

          {/* Right: search / flag / profile */}
          <div className="catalog-header-right flex items-center gap-2 sm:gap-3 justify-end min-w-0">
            {isHome && (
              <>
                {/* Full search — expanded desktop */}
                <div
                  className={cn(
                    "transition-all duration-300 overflow-hidden",
                    compact
                      ? "w-0 opacity-0 pointer-events-none"
                      : "hidden sm:block w-[min(100%,18rem)] md:w-[min(100%,20rem)] lg:w-[22rem] opacity-100",
                  )}
                >
                  <div className="atlys-search w-full">
                    <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
                    <input
                      type="search"
                      placeholder="Search Country"
                      value={catalog.q}
                      onChange={(e) => catalog.setQ(e.target.value)}
                      data-testid="hero-search"
                      aria-label="Search country"
                      tabIndex={compact ? -1 : undefined}
                      className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted/70 min-w-0"
                    />
                  </div>
                </div>

                {/* Compact search icon */}
                <div
                  className={cn(
                    "relative transition-all duration-300",
                    compact ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none absolute w-0 h-0 overflow-hidden",
                  )}
                >
                  <button
                    type="button"
                    className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full border border-border bg-white flex items-center justify-center text-ink hover:bg-[#f7f7f7] transition-colors"
                    aria-label="Search country"
                    aria-expanded={catalog.searchExpanded}
                    data-testid="compact-search-toggle"
                    onClick={() => catalog.setSearchExpanded(!catalog.searchExpanded)}
                    tabIndex={compact ? undefined : -1}
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {compact && catalog.searchExpanded && (
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[min(calc(100vw-2rem),20rem)]"
                      >
                        <div className="atlys-search w-full shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
                          <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
                          <input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Search Country"
                            value={catalog.q}
                            onChange={(e) => catalog.setQ(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") catalog.setSearchExpanded(false);
                            }}
                            data-testid="compact-search-input"
                            aria-label="Search country"
                            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted/70 min-w-0"
                          />
                          {catalog.q && (
                            <button
                              type="button"
                              className="text-ink-muted hover:text-ink p-0.5"
                              aria-label="Clear search"
                              onClick={() => catalog.setQ("")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* India flag — expanded only */}
            <div
              className={cn(
                "transition-all duration-300",
                compact
                  ? "opacity-0 scale-95 pointer-events-none absolute w-0 h-0 overflow-hidden"
                  : "hidden sm:flex opacity-100",
              )}
              aria-hidden={compact}
            >
              <div
                className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-white text-base leading-none select-none"
                title="India"
                aria-label="Indian passport"
                role="img"
              >
                🇮🇳
              </div>
            </div>

            {customer && <NotificationBell />}

            {customer ? (
              <Link
                href="/account"
                className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full border border-border bg-white flex items-center justify-center text-xs font-bold text-ink hover:bg-[#f7f7f7] transition-colors"
                data-testid="nav-user"
                aria-label="Account"
              >
                {user?.full_name?.[0]?.toUpperCase() || <UserRound className="w-4 h-4 text-ink-muted" />}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full border border-border bg-white flex items-center justify-center text-ink-muted hover:text-ink hover:bg-[#f7f7f7] transition-colors"
                data-testid="nav-signin"
                aria-label="Sign in"
              >
                <UserRound className="w-4 h-4" />
              </Link>
            )}

            <button
              type="button"
              className="md:hidden p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-[#f3f3f3] transition-colors text-ink-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Expanded: full-width filter row (desktop + mobile) */}
          {isHome && !compact && (
            <div className="catalog-header-filters-row col-span-full pt-1 pb-4 md:pb-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <div className="flex justify-center">
                <CatalogFilters />
              </div>
            </div>
          )}

          {/* Compact mobile: horizontally scrollable filters */}
          {isHome && compact && (
            <div className="catalog-header-filters-mobile md:hidden col-span-full pb-3 -mx-4 px-4 overflow-x-auto scrollbar-none">
              <CatalogFilters compact className="!w-max min-w-full !flex-nowrap" />
            </div>
          )}
        </div>

        {/* Expanded mobile search under nav when not compact */}
        {isHome && !compact && (
          <div className="sm:hidden px-4 pb-3">
            <div className="atlys-search w-full">
              <Search className="w-4 h-4 text-ink-muted shrink-0" aria-hidden />
              <input
                type="search"
                placeholder="Search Country"
                value={catalog.q}
                onChange={(e) => catalog.setQ(e.target.value)}
                aria-label="Search country"
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
                    type="button"
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

      <main id="main" className="pb-mobile-nav md:pb-0">
        {children}
      </main>

      <footer className="amara-footer-glass mt-16 md:mt-24">
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
  const year = new Date().getFullYear();

  return (
    <div className="max-w-[1200px] mx-auto px-5 md:px-10">
      {/* Top divider — content-width like Atlys */}
      <div className="border-t border-black/[0.08]" />

      {/* Main footer content between the two lines */}
      <div className="py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href="/" className="inline-flex mb-5" aria-label="AmaraVisa home">
              <AmaraVisaLogo size="md" />
            </Link>
            <p className="text-[15px] text-ink-muted leading-relaxed max-w-[280px]">
              AmaraVisa helps you plan, apply, and track visas seamlessly — with transparent fees and expert review.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/60 px-3.5 py-2">
              <ShieldCheck className="w-4 h-4 text-navy shrink-0" />
              <span className="text-xs font-semibold text-ink">Visas On Time Guaranteed</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StoreBadgeLink
                href={SUPPORT.appStoreUrl}
                label="Download on the App Store"
                testId="footer-app-store"
              >
                <AppStoreBadge />
              </StoreBadgeLink>
              <StoreBadgeLink
                href={SUPPORT.playStoreUrl}
                label="Get it on Google Play"
                testId="footer-play-store"
              >
                <GooglePlayBadge />
              </StoreBadgeLink>
            </div>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <FooterHeading>Company</FooterHeading>
            <ul className="space-y-3">
              <li><FooterLink href="/">All destinations</FooterLink></li>
              <li><FooterLink href="/auth">Sign in</FooterLink></li>
              <li><FooterLink href="/account">My applications</FooterLink></li>
              <li>
                <a
                  href={SUPPORT.crmUrl}
                  className="text-[15px] text-ink/80 hover:text-ink transition-colors"
                  data-testid="footer-crm-link"
                >
                  Consultant login
                </a>
              </li>
            </ul>
          </div>

          {/* Popular destinations */}
          <div className="lg:col-span-3">
            <FooterHeading>Popular destinations</FooterHeading>
            <ul className="space-y-3">
              {["Singapore", "United Arab Emirates", "United Kingdom", "Australia", "Thailand"].map((c) => (
                <li key={c}>
                  <FooterLink href="/">{c}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support / contact */}
          <div className="lg:col-span-3">
            <FooterHeading>Support</FooterHeading>
            <ul className="space-y-4">
              <li>
                <a
                  href={`mailto:${SUPPORT.email}`}
                  className="flex items-start gap-2.5 text-[15px] text-ink/80 hover:text-ink transition-colors"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <span className="break-all">{SUPPORT.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SUPPORT.phone}`}
                  className="flex items-start gap-2.5 text-[15px] text-ink/80 hover:text-ink transition-colors"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  {SUPPORT.phone}
                </a>
              </li>
              <li>
                <a
                  href={SUPPORT.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2.5 text-[15px] text-ink/80 hover:text-ink transition-colors"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </span>
                  WhatsApp support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom divider — content-width */}
      <div className="border-t border-black/[0.08]" />

      {/* Copyright row below the second line */}
      <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-ink-muted text-center sm:text-left">
          © {year} AmaraVisa India Private Limited
          <span className="mx-2 text-border-strong">·</span>
          <span>All rights reserved</span>
        </p>
        <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity" aria-label="AmaraVisa">
          <AmaraVisaLogo size="sm" />
        </Link>
      </div>
    </div>
  );
}

function FooterHeading({ children }) {
  return (
    <div className="text-sm font-semibold text-ink-muted mb-4">
      {children}
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link href={href} className="text-[15px] text-ink/80 hover:text-ink transition-colors">
      {children}
    </Link>
  );
}

function StoreBadgeLink({ href, label, testId, children }) {
  const external = /^https?:\/\//i.test(href);
  const className =
    "inline-flex transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 rounded-[8px]";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        data-testid={testId}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={label} data-testid={testId} className={className}>
      {children}
    </Link>
  );
}

function AppStoreBadge() {
  return (
    <svg
      width="135"
      height="40"
      viewBox="0 0 135 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <rect width="135" height="40" rx="8" fill="#000" />
      <path
        fill="#fff"
        d="M24.75 20.3c0-2.1 1.72-3.14 1.8-3.19-1-1.46-2.54-1.66-3.08-1.68-1.3-.13-2.55.77-3.21.77-.67 0-1.69-.76-2.78-.74-1.42.02-2.74.84-3.47 2.12-1.49 2.58-.38 6.4 1.06 8.5.71 1.02 1.55 2.17 2.65 2.13 1.07-.04 1.47-.68 2.76-.68 1.28 0 1.65.68 2.77.66 1.15-.02 1.87-1.03 2.56-2.06.81-1.17 1.14-2.31 1.16-2.37-.03-.01-2.2-.85-2.22-3.36zm-2.08-6.12c.58-.71.97-1.69.86-2.67-.84.03-1.86.57-2.46 1.27-.54.62-1.01 1.63-.88 2.58.93.07 1.88-.47 2.48-1.18z"
      />
      <text x="36" y="15.5" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7.5" letterSpacing="0.2">
        Download on the
      </text>
      <text x="36" y="28.5" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="600" letterSpacing="-0.2">
        App Store
      </text>
    </svg>
  );
}

function GooglePlayBadge() {
  return (
    <svg
      width="152"
      height="40"
      viewBox="0 0 152 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <rect width="152" height="40" rx="8" fill="#000" />
      <path fill="#EA4335" d="M14.2 8.4 24.6 19l-3.3 3.3-10.4-10.4c.4-.8 1.3-1.4 2.3-1.6.4-.1.7-.1 1-.1z" />
      <path fill="#FBBC04" d="M8.8 9.6c-.4.5-.6 1.1-.6 1.8v17.2c0 .7.2 1.3.6 1.8l.1.1L19.8 20 8.9 9.5l-.1.1z" />
      <path fill="#4285F4" d="M29.4 17.6c-.5-.3-2.3-1.3-2.3-1.3l-2.5-1.4-3.3 3.3 3.3 3.3 2.5-1.4s1.8-1 2.3-1.3c.7-.4.7-1.1.7-1.3s0-.9-.7-1.2z" />
      <path fill="#34A853" d="M14.2 31.6c1 .2 2.1-.2 2.8-.9l7.6-7.6-3.3-3.3-10.4 10.4c.7.8 1.8 1.3 3.3 1.4z" />
      <text x="38" y="15.5" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7.5" letterSpacing="0.6">
        GET IT ON
      </text>
      <text x="38" y="28.5" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="600" letterSpacing="-0.2">
        Google Play
      </text>
    </svg>
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
