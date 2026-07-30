"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Umbrella, Zap, Plane } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisaProducts } from "@/hooks/customer-api";
import { useCatalogSearch } from "@/context/catalog-search";
import {
  INR,
  cn,
  countryCoverUrl,
  formatVisaTypeShort,
  formatValidityShort,
  guaranteedByDateTime,
} from "@/lib/utils";
import { track } from "@/lib/telemetry";

const ease = [0.16, 1, 0.3, 1];

export default function LandingPage() {
  const reduce = useReducedMotion();
  const { q, setQ } = useCatalogSearch();
  const [visaType, setVisaType] = useState("");
  const [delivery, setDelivery] = useState("any");
  const [complexity, setComplexity] = useState("");
  const [travelDate, setTravelDate] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (complexity) p.complexity = complexity;
    if (travelDate) p.travel_date = travelDate;
    return p;
  }, [complexity, travelDate]);

  const { data: products = [], isLoading, isError, refetch } = useVisaProducts(params);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.country_name.toLowerCase().includes(q.toLowerCase()) && !p.title.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      if (visaType && p.visa_type !== visaType) return false;
      if (delivery === "fast" && p.processing_time_days > 7) return false;
      return true;
    });
  }, [products, q, visaType, delivery]);

  const clearFilters = () => {
    setQ("");
    setVisaType("");
    setDelivery("any");
    setComplexity("");
    setTravelDate("");
  };

  const hasFilters = Boolean(q || visaType || delivery !== "any" || complexity || travelDate);

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-24">
        {/* Atlys-style unified filter pill */}
        <div className="atlys-filter-bar mb-8" data-testid="filter-bar">
          <FilterSection
            icon={<Zap className="w-4 h-4 text-emerald-500" />}
            label="Visa delivery:"
            testid="filter-delivery"
          >
            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              className="atlys-filter-select"
            >
              <option value="any">Any Time</option>
              <option value="fast">Fast (≤7 days)</option>
            </select>
          </FilterSection>

          <FilterDivider />

          <FilterSection
            icon={<Plane className="w-4 h-4 text-sky-500" />}
            label="Type:"
            testid="filter-type"
          >
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="atlys-filter-select"
            >
              <option value="">All Visa Types</option>
              <option value="tourist">Tourist</option>
              <option value="business">Business</option>
              <option value="transit">Transit</option>
            </select>
          </FilterSection>

          <FilterDivider />

          <FilterSection
            icon={<FileText className="w-4 h-4 text-orange-500" />}
            label="Documents:"
            testid="filter-complexity"
          >
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="atlys-filter-select"
            >
              <option value="">Any Documents</option>
              <option value="simple">Simple (≤3)</option>
              <option value="medium">Medium (4–6)</option>
              <option value="complex">Complex (7+)</option>
            </select>
          </FilterSection>

          <FilterDivider />

          <FilterSection
            icon={<Umbrella className="w-4 h-4 text-pink-500" />}
            label="Holidays:"
            testid="filter-travel-date"
          >
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              placeholder="Select Dates"
              className="atlys-filter-date"
            />
          </FilterSection>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="hidden lg:block ml-2 text-xs font-semibold text-teal hover:text-navy transition-colors whitespace-nowrap"
              data-testid="clear-filters"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] rounded-[28px]" />
                <Skeleton className="h-4 w-3/4 mt-3 rounded-lg" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load visas" description="Check your connection and try again." onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyCatalog hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <div
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5"
            data-testid="catalog-grid"
          >
            {filtered.map((p, i) => (
              <VisaCard key={p.id} product={p} index={i} reduce={reduce} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSection({ icon, label, children, testid }) {
  return (
    <div className="atlys-filter-section" data-testid={testid}>
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-sm text-ink-muted whitespace-nowrap hidden sm:inline">{label}</span>
      </div>
      {children}
    </div>
  );
}

function FilterDivider() {
  return <div className="hidden md:block w-px h-8 bg-border/70 shrink-0" />;
}

function VisaCard({ product, index, reduce }) {
  const totalFee = (product.fees?.govt_fee || 0) + (product.fees?.service_fee || 0);
  const cover = countryCoverUrl(product);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25), ease }}
    >
      <Link
        href={`/visa/${product.id}`}
        data-testid={`visa-card-${product.country_code}`}
        onClick={() => track("visa_card_click", { product_id: product.id })}
        className="group block"
      >
        <div className="atlys-destination-card">
          <Image
            src={cover}
            alt={product.country_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="atlys-destination-overlay" />
          <div className="atlys-destination-content">
            <span className="text-2xl md:text-3xl leading-none drop-shadow-sm">{product.country_flag}</span>
            <h3 className="font-display text-lg md:text-xl tracking-[0.12em] text-white uppercase text-center leading-tight">
              {product.country_name}
            </h3>
            <div className="grid grid-cols-3 gap-2 w-full mt-1 px-1">
              <CardMeta label="Type" value={formatVisaTypeShort(product.visa_type)} />
              <CardMeta label="Valid" value={formatValidityShort(product.validity_days)} />
              <CardMeta label="Fees" value={INR.format(totalFee)} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs md:text-sm text-ink-muted">
          Guaranteed Visa On{" "}
          <span className="font-semibold text-ink">
            {guaranteedByDateTime(product.processing_time_days)}
          </span>
        </p>
      </Link>
    </motion.div>
  );
}

function CardMeta({ label, value }) {
  return (
    <div className="text-center min-w-0">
      <div className="text-[9px] md:text-[10px] uppercase tracking-wider text-white/65 font-medium">{label}</div>
      <div className="text-[10px] md:text-xs font-semibold text-white truncate mt-0.5">{value}</div>
    </div>
  );
}

function EmptyCatalog({ hasFilters, onClear }) {
  return (
    <EmptyState
      title="No visas match those filters"
      description="Try clearing filters or search for a different country."
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
