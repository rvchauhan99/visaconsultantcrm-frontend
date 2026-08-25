"use client";

import { useMemo } from "react";
import { CalendarHeart, Files, PlaneTakeoff, Rocket } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { DeliveryFilterSelect } from "@/components/catalog/delivery-filter-select";
import { VisaFormatFilterSelect } from "@/components/catalog/visa-format-filter-select";
import { DocumentsProfileFilterSelect } from "@/components/catalog/documents-profile-filter-select";
import { useCatalogSearch } from "@/context/catalog-search";
import { useVisaProducts } from "@/hooks/customer-api";
import { countDeliveryBuckets, matchesDelivery } from "@/lib/delivery-filter";
import { countVisaFormatBuckets, matchesVisaFormat } from "@/lib/visa-format-filter";
import {
  countDocumentsProfileBuckets,
  matchesDocumentsProfile,
} from "@/lib/documents-profile-filter";
import { cn } from "@/lib/utils";

const FILTER_TRIGGER =
  "border-0 bg-transparent shadow-none px-0 py-0 rounded-none font-semibold text-sm hover:border-0 focus:border-transparent focus:shadow-none min-w-0 w-full justify-between";

const FILTER_DATE_TRIGGER = `${FILTER_TRIGGER} [&_span:first-child>svg]:hidden`;

/**
 * Single filter bar instance — used in the sticky header for both expanded and compact layouts.
 */
export default function CatalogFilters({ compact = false, className }) {
  const {
    q,
    visaFormat,
    setVisaFormat,
    delivery,
    setDelivery,
    documentsProfile,
    setDocumentsProfile,
    travelDate,
    setTravelDate,
    clearFilters,
    hasFilters,
  } = useCatalogSearch();

  const params = useMemo(() => {
    const p = {};
    if (travelDate) p.travel_date = travelDate;
    return p;
  }, [travelDate]);

  const { data: rawProducts } = useVisaProducts(params);

  const catalogBase = useMemo(() => {
    const products = Array.isArray(rawProducts) ? rawProducts : [];
    return products.filter((p) => {
      if (
        q &&
        !p.country_name?.toLowerCase().includes(q.toLowerCase()) &&
        !p.title?.toLowerCase().includes(q.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [rawProducts, q]);

  const deliveryCounts = useMemo(() => {
    const base = catalogBase
      .filter((p) => matchesVisaFormat(p, visaFormat))
      .filter((p) => matchesDocumentsProfile(p, documentsProfile));
    return countDeliveryBuckets(base);
  }, [catalogBase, visaFormat, documentsProfile]);

  const visaFormatCounts = useMemo(() => {
    const base = catalogBase
      .filter((p) => matchesDelivery(p, delivery))
      .filter((p) => matchesDocumentsProfile(p, documentsProfile));
    return countVisaFormatBuckets(base);
  }, [catalogBase, delivery, documentsProfile]);

  const documentsProfileCounts = useMemo(() => {
    const base = catalogBase
      .filter((p) => matchesDelivery(p, delivery))
      .filter((p) => matchesVisaFormat(p, visaFormat));
    return countDocumentsProfileBuckets(base);
  }, [catalogBase, delivery, visaFormat]);

  return (
    <div
      className={cn(
        "atlys-filter-bar",
        compact && "atlys-filter-bar--compact",
        className,
      )}
      data-testid="filter-bar"
      data-compact={compact ? "true" : "false"}
    >
      <FilterSection
        icon={<Rocket className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="emerald"
        label="Visa delivery"
      >
        <DeliveryFilterSelect
          data-testid="filter-delivery"
          value={delivery}
          onChange={(v) => setDelivery(typeof v === "string" ? v : "any")}
          counts={deliveryCounts}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
        />
      </FilterSection>

      <FilterDivider />

      <FilterSection
        icon={<PlaneTakeoff className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="sky"
        label="Type"
      >
        <VisaFormatFilterSelect
          data-testid="filter-type"
          value={visaFormat}
          onChange={(v) => setVisaFormat(typeof v === "string" ? v : "any")}
          counts={visaFormatCounts}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
        />
      </FilterSection>

      <FilterDivider />

      <FilterSection
        icon={<Files className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="amber"
        label="Documents"
      >
        <DocumentsProfileFilterSelect
          data-testid="filter-documents"
          value={documentsProfile}
          onChange={(v) => setDocumentsProfile(typeof v === "string" ? v : "any")}
          counts={documentsProfileCounts}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
        />
      </FilterSection>

      <FilterDivider />

      <FilterSection
        icon={<CalendarHeart className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="rose"
        label="Holidays"
      >
        <DatePicker
          data-testid="filter-travel-date"
          value={travelDate || null}
          onChange={(v) => setTravelDate(typeof v === "string" ? v : "")}
          placeholder="Select Dates"
          clearable
          className="w-full min-w-0"
          triggerClassName={FILTER_DATE_TRIGGER}
          contentClassName="min-w-[280px]"
        />
      </FilterSection>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="hidden lg:block ml-1 text-xs font-semibold text-teal hover:text-navy transition-colors whitespace-nowrap shrink-0"
          data-testid="clear-filters"
        >
          Clear
        </button>
      )}
    </div>
  );
}

const ICON_TONES = {
  emerald: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/15",
  sky: "bg-sky-500/12 text-sky-600 ring-sky-500/15",
  amber: "bg-amber-500/12 text-amber-600 ring-amber-500/15",
  rose: "bg-rose-500/12 text-rose-500 ring-rose-500/15",
};

function FilterSection({ icon, iconTone = "emerald", label, children, testid }) {
  return (
    <div className="atlys-filter-section" data-testid={testid}>
      <div
        className={cn(
          "atlys-filter-icon flex h-9 w-9 items-center justify-center rounded-full ring-1 shrink-0",
          ICON_TONES[iconTone],
        )}
      >
        {icon}
      </div>
      <div className="atlys-filter-fields">
        <span className="atlys-filter-label">{label}</span>
        {children}
      </div>
    </div>
  );
}

function FilterDivider() {
  return <div className="atlys-filter-divider w-px self-stretch min-h-[2.5rem] bg-border/70 shrink-0" />;
}
