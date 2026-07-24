"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Calendar, FileText, Gauge, Plane, Search, ShieldCheck, Zap,
  ArrowRight, Users, Clock, Star, ChevronDown,
} from "lucide-react";
import Stamp from "@/components/ui/stamp";
import { Card, EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisaProducts } from "@/hooks/customer-api";
import { INR, guaranteedByText } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1];

/* ── Motion variants ── */
const heroCopy = {
  hidden: { opacity: 0, y: 20 },
  show: (r) => (r ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, transition: { duration: 0.6, ease } }),
};
const heroImage = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: (r) => (r ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.72, delay: 0.14, ease } }),
};
const stagger = {
  hidden: {},
  show: (r) => ({ transition: r ? {} : { staggerChildren: 0.08, delayChildren: 0.06 } }),
};
const item = {
  hidden: (r) => (r ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }),
  show: (r) => (r ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, transition: { duration: 0.48, ease } }),
};

/* ── Trust stats ── */
const FEATURES = [
  {
    icon: <Users className="w-5 h-5" />,
    label: "Human-reviewed",
    description: "Every document reviewed by a dedicated consultant before filing",
    stat: "100%",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    label: "On-time guarantee",
    description: "Filed on schedule or your full service fee refunded — no questions",
    stat: "On-time or free",
  },
  {
    icon: <Star className="w-5 h-5" />,
    label: "Transparent pricing",
    description: "Government fee + service fee shown upfront. Zero hidden charges",
    stat: "No surprises",
  },
];

/* ══════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════ */

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const [visaType, setVisaType] = useState("");
  const [delivery, setDelivery] = useState("any");
  const [complexity, setComplexity] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const params = useMemo(() => {
    const p = {};
    if (complexity) p.complexity = complexity;
    if (travelDate) p.travel_date = travelDate;
    return p;
  }, [complexity, travelDate]);

  const { data: products = [], isLoading, isError, refetch } = useVisaProducts(params);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.country_name.toLowerCase().includes(q.toLowerCase()) && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (visaType && p.visa_type !== visaType) return false;
      if (delivery === "fast" && p.processing_time_days > 7) return false;
      return true;
    });
  }, [products, q, visaType, delivery]);

  const clearFilters = () => { setQ(""); setVisaType(""); setDelivery("any"); setComplexity(""); setTravelDate(""); };
  const hasFilters = Boolean(q || visaType || delivery !== "any" || complexity || travelDate);

  return (
    <div>

      {/* ════════════════════════════════
          HERO SECTION
      ════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden hero-gradient min-h-[92vh] flex items-center">
        {/* Layered background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_70%_40%,rgba(47,107,90,0.11),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_5%_80%,rgba(176,141,87,0.08),transparent_55%)]" />
          {/* Grain */}
          <div className="absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-10 pt-8 pb-16 md:pb-20 grid md:grid-cols-2 gap-10 lg:gap-16 items-center w-full">

          {/* ── Left: Copy ── */}
          <motion.div custom={reduce} variants={heroCopy} initial="hidden" animate="show">
            <motion.div
              custom={reduce}
              variants={item}
              className="inline-flex items-center gap-2 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.3em] text-teal font-semibold">
                For Indian passport holders
              </span>
            </motion.div>

            <motion.h1
              custom={reduce}
              variants={item}
              className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] leading-[1.0] tracking-tight text-navy mb-6"
            >
              Visas,{" "}
              <span className="italic text-teal">edited</span>
              <br />
              for clarity.
            </motion.h1>

            <motion.p
              custom={reduce}
              variants={item}
              className="text-lg md:text-xl text-ink-muted max-w-md mb-8 leading-relaxed"
            >
              A consultant reviews every page, files with care, and writes you at each stamp. Fees on the cover. No fine print in the margins.
            </motion.p>

            {/* Guarantee badge */}
            <motion.div custom={reduce} variants={item} className="flex flex-wrap gap-3 items-center mb-8">
              <Stamp tone="gold" size="md" className="motion-safe:animate-stamp-in">
                Guaranteed
              </Stamp>
              <span className="text-sm text-ink-muted">on-time filing — or your service fee back.</span>
            </motion.div>

            {/* CTAs */}
            <motion.div custom={reduce} variants={item} className="flex flex-wrap gap-3 items-center">
              <a
                href="#catalog"
                className={cn(
                  "inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white",
                  "bg-gradient-to-r from-navy via-teal to-navy bg-[length:200%_100%]",
                  "shadow-[0_6px_20px_var(--glow-navy)]",
                  "hover:bg-right hover:shadow-[0_10px_32px_var(--glow-navy)] hover:-translate-y-px",
                  "transition-all duration-300",
                )}
                onClick={() => track("hero_browse_cta")}
              >
                <Plane className="w-4 h-4" />
                Browse destinations
              </a>
              <Link
                href="/auth"
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-medium",
                  "border border-border-strong/70 bg-[var(--glass)] backdrop-blur-sm",
                  "text-ink hover:border-navy hover:text-navy",
                  "transition-all duration-300 hover:-translate-y-px",
                )}
              >
                Track application
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </motion.div>

          {/* ── Right: Image ── */}
          <motion.div
            className="relative"
            custom={reduce}
            variants={heroImage}
            initial="hidden"
            animate="show"
            style={reduce ? {} : { y: heroY }}
          >
            {/* Main image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1742327648952-5babf1d04ae4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000"
              alt="Travel documents arranged on warm paper"
              className="w-full h-[380px] md:h-[500px] object-cover rounded-[28px] shadow-[var(--shadow-lift)]"
            />

            {/* Glass float card — bottom left */}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: -16, y: 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease }}
              className={cn(
                "absolute -bottom-5 -left-3 md:-left-6 rounded-2xl px-5 py-4",
                "bg-[var(--glass)] backdrop-blur-2xl border border-[var(--border-glass)]",
                "shadow-[var(--shadow-lift)]",
              )}
            >
              <div className="text-[10px] uppercase font-mono tracking-[0.2em] text-ink-muted">Trusted since</div>
              <div className="font-display text-4xl text-navy leading-none mt-1">2019</div>
            </motion.div>

            {/* Seal — top right */}
            <Stamp
              tone="gold"
              size="md"
              className={cn(
                "absolute -top-3 right-4 md:right-6 rotate-[-6deg]",
                "bg-surface-card/95 shadow-[var(--shadow-premium)]",
                "motion-safe:animate-stamp-in",
              )}
            >
              Passage seal
            </Stamp>

            {/* Float badge — mid right */}
            <motion.div
              animate={reduce ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute top-1/3 -right-4 md:-right-5 rounded-2xl px-4 py-3",
                "bg-[var(--glass)] backdrop-blur-2xl border border-[var(--border-glass)]",
                "shadow-[var(--shadow-premium)]",
              )}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">Cases filed</div>
              <div className="font-display text-2xl text-navy">1,200+</div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          animate={reduce ? {} : { y: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ink-muted/50"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </section>

      {/* ════════════════════════════════
          FEATURE STRIP
      ════════════════════════════════ */}
      <section className="strip-gradient py-16 md:py-20 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 0.1} reduce={reduce} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          FILTER + CATALOG
      ════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 pt-16 md:pt-20" id="catalog">
        {/* Section label */}
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-ink-muted font-mono mb-2">The catalog</p>
            <h2 className="font-display text-3xl md:text-4xl text-navy">Choose your destination</h2>
          </div>
          <span className="text-sm text-ink-muted font-mono shrink-0">
            {isLoading ? "—" : `${filtered.length} visa${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Filter bar */}
        <div className={cn(
          "mb-10 p-3 md:p-4 rounded-2xl border border-border/80",
          "bg-[var(--glass)] backdrop-blur-xl shadow-[var(--shadow-premium)]",
          "flex flex-wrap gap-x-2 gap-y-2.5 items-center",
        )}>
          {/* Search */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[180px] bg-surface-card border border-border rounded-xl px-3.5 py-2.5 focus-within:border-navy focus-within:shadow-[0_0_0_3px_var(--glow-navy)] transition-all">
            <Search className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <input
              data-testid="catalog-search"
              placeholder="Search destination…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted text-ink"
            />
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <FilterPill icon={<Zap className="w-3 h-3" />} label="Speed" options={[["any", "Any speed"], ["fast", "Fast-track (≤7d)"]]} value={delivery} onChange={setDelivery} testid="filter-delivery" />
          <FilterPill icon={<FileText className="w-3 h-3" />} label="Type" options={[["", "All types"], ["tourist", "Tourist"], ["business", "Business"], ["transit", "Transit"]]} value={visaType} onChange={setVisaType} testid="filter-type" />
          <FilterPill icon={<Gauge className="w-3 h-3" />} label="Complexity" options={[["", "Any"], ["simple", "Simple"], ["medium", "Medium"], ["complex", "Complex"]]} value={complexity} onChange={setComplexity} testid="filter-complexity" />

          <label className="flex items-center gap-2 text-sm cursor-pointer bg-surface-card border border-border rounded-xl px-3.5 py-2.5 hover:border-border-strong transition-colors">
            <Plane className="w-3 h-3 text-ink-muted shrink-0" />
            <span className="text-ink-muted hidden sm:inline text-xs">Travel</span>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              data-testid="filter-travel-date"
              className="bg-transparent outline-none text-ink text-sm border-none cursor-pointer"
            />
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-teal font-medium hover:text-navy transition-colors underline underline-offset-2"
              data-testid="clear-filters"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 pb-24">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-[360px]" />
            ))}
          </div>
        ) : isError ? (
          <div className="pb-24">
            <ErrorState title="Couldn't load visas" description="Check your connection and try again." onRetry={() => refetch()} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pb-24">
            <EmptyCatalog hasFilters={hasFilters} onClear={clearFilters} />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 pb-24 md:pb-32"
            data-testid="catalog-grid"
            custom={reduce}
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {filtered.map((p) => (
              <motion.div key={p.id} custom={reduce} variants={item}>
                <VisaCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

/* ────────────────────────────────────
   Feature card
──────────────────────────────────── */
function FeatureCard({ icon, label, description, stat, delay, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease }}
      className={cn(
        "group relative overflow-hidden rounded-[20px] p-6 border border-border",
        "bg-gradient-to-br from-surface-card to-surface-warm",
        "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-premium)]",
        "transition-all duration-300 hover:-translate-y-1",
      )}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_80%_80%_at_50%_120%,rgba(31,74,58,0.06),transparent)]" />

      <div className="relative">
        <div className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-4",
          "bg-navy/8 text-navy border border-navy/12",
          "group-hover:bg-navy group-hover:text-white group-hover:border-navy transition-all duration-300",
        )}>
          {icon}
        </div>

        <div className="font-display text-2xl text-navy mb-0.5">{stat}</div>
        <div className="text-xs font-semibold uppercase tracking-widest text-teal mb-3">{label}</div>
        <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────
   Filter pill
──────────────────────────────────── */
function FilterPill({ icon, label, options, value, onChange, testid }) {
  const active = value && value !== "" && value !== "any";
  return (
    <label className={cn(
      "flex items-center gap-2 text-sm cursor-pointer rounded-xl px-3.5 py-2.5 transition-all border",
      active
        ? "bg-navy/8 border-navy/20 text-navy"
        : "bg-surface-card border-border hover:border-border-strong text-ink-muted",
    )}>
      <span>{icon}</span>
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="bg-transparent outline-none text-sm font-medium border-none cursor-pointer text-current max-w-[80px]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

/* ────────────────────────────────────
   Visa card
──────────────────────────────────── */
function VisaCard({ product }) {
  const totalFee = (product.fees?.govt_fee || 0) + (product.fees?.service_fee || 0);

  return (
    <Link
      href={`/visa/${product.id}`}
      data-testid={`visa-card-${product.country_code}`}
      onClick={() => track("visa_card_click", { product_id: product.id })}
      className={cn(
        "group block h-full rounded-[22px] overflow-hidden border border-border",
        "bg-gradient-to-br from-surface-card to-surface-warm",
        "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]",
        "hover:-translate-y-1.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.banner_image_url || "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800"}
          alt={product.country_name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600 ease-out motion-reduce:transition-none"
        />

        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Top right badge */}
        <div className="absolute top-3 right-3">
          <Stamp tone="gold" size="sm" className="bg-[var(--glass)] backdrop-blur-md shadow-sm">
            By {guaranteedByText(product.processing_time_days)}
          </Stamp>
        </div>

        {/* Bottom left country */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-[var(--glass)] backdrop-blur-md px-3 py-1.5 rounded-full text-xs border border-[var(--border-glass)]">
          <span className="text-xl leading-none">{product.country_flag}</span>
          <span className="font-semibold text-ink">{product.country_name}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6">
        <h3 className="font-display text-xl md:text-[1.3rem] text-navy leading-tight mb-3">
          {product.title}
        </h3>

        <div className="flex items-center gap-3 text-[11px] text-ink-muted font-mono uppercase tracking-[0.12em] mb-5">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {product.processing_time_days}d process
          </span>
          <span className="text-border-strong">·</span>
          <span>{product.validity_days}d validity</span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-4 border-t border-border/60">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-[0.2em] text-ink-muted mb-1">From</div>
            <div className="font-display text-2xl md:text-[1.8rem] text-ink leading-none">
              {INR.format(totalFee)}
            </div>
          </div>

          <span className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full",
            "bg-navy/0 border border-navy/20 text-navy",
            "group-hover:bg-gradient-to-r group-hover:from-navy group-hover:to-teal group-hover:text-white group-hover:border-transparent",
            "transition-all duration-300",
          )}>
            Apply
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ────────────────────────────────────
   Empty catalog
──────────────────────────────────── */
function EmptyCatalog({ hasFilters, onClear }) {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="No visas match those filters yet."
      description="Try clearing them to see what's available."
      action={
        hasFilters ? (
          <Button variant="secondary" onClick={onClear} data-testid="clear-filters-empty">
            Clear filters
          </Button>
        ) : null
      }
    />
  );
}
