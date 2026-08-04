"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVisaProducts } from "@/hooks/customer-api";
import { useCatalogSearch } from "@/context/catalog-search";
import {
  INR,
  countryCoverUrl,
  formatVisaTypeShort,
  formatValidityShort,
  guaranteedByDateTime,
} from "@/lib/utils";
import { track } from "@/lib/telemetry";

export default function LandingPage() {
  const {
    q,
    visaType,
    delivery,
    complexity,
    travelDate,
    clearFilters,
    hasFilters,
    headerCompact,
  } = useCatalogSearch();

  const params = useMemo(() => {
    const p = {};
    if (complexity) p.complexity = complexity;
    if (travelDate) p.travel_date = travelDate;
    return p;
  }, [complexity, travelDate]);

  const { data: rawProducts, isLoading, isError, refetch } = useVisaProducts(params);
  const products = useMemo(
    () => (Array.isArray(rawProducts) ? rawProducts : []),
    [rawProducts],
  );

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

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)]">
      <div
        className={`max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 pb-24 sm:pb-28 transition-[padding] duration-300 ${
          headerCompact ? "pt-4 sm:pt-5 md:pt-6" : "pt-2 md:pt-3"
        }`}
      >
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i}>
                <Skeleton className="aspect-[3/4] rounded-[20px] sm:rounded-[28px]" />
                <Skeleton className="h-4 w-3/4 mt-3 rounded-lg mx-auto" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load visas" description="Check your connection and try again." onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyCatalog hasFilters={hasFilters} onClear={clearFilters} />
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5"
            data-testid="catalog-grid"
          >
            {filtered.map((p, i) => (
              <VisaCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const COVER_FALLBACK =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?crop=entropy&cs=srgb&fm=jpg&q=80&w=900";

function VisaCard({ product, index }) {
  const totalFee = (product.fees?.govt_fee || 0) + (product.fees?.service_fee || 0);
  const [cover, setCover] = useState(() => countryCoverUrl(product));

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${Math.min(index * 50, 250)}ms`, animationDuration: "400ms" }}
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
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
            onError={() => {
              if (cover !== COVER_FALLBACK) setCover(COVER_FALLBACK);
            }}
          />
          <div className="atlys-destination-overlay" />
          <div className="atlys-destination-cta" aria-hidden="true">
            <span className="atlys-destination-cta-btn">More details</span>
          </div>
          <div className="atlys-destination-content">
            <span className="text-2xl md:text-3xl leading-none drop-shadow-sm">{product.country_flag}</span>
            <h3 className="font-display text-sm sm:text-lg md:text-xl tracking-[0.08em] sm:tracking-[0.12em] text-white uppercase text-center leading-tight px-1">
              {product.country_name}
            </h3>
            <div className="grid grid-cols-3 gap-1 sm:gap-2 w-full mt-1 px-0.5 sm:px-1">
              <CardMeta label="Type" value={formatVisaTypeShort(product.visa_type)} />
              <CardMeta label="Valid" value={formatValidityShort(product.validity_days)} />
              <CardMeta label="Fees" value={INR.format(totalFee)} />
            </div>
          </div>
        </div>
        <p className="mt-2 sm:mt-3 text-center text-[11px] sm:text-xs md:text-sm text-ink-muted px-1 leading-snug">
          Guaranteed Visa On{" "}
          <span className="font-semibold text-ink">
            {guaranteedByDateTime(product.processing_time_days)}
          </span>
        </p>
      </Link>
    </div>
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
