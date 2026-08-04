"use client";

import { CalendarHeart, Files, PlaneTakeoff, Rocket } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { useCatalogSearch } from "@/context/catalog-search";
import { cn } from "@/lib/utils";

const FILTER_TRIGGER =
  "border-0 bg-transparent shadow-none px-0 py-0 rounded-none font-semibold text-sm hover:border-0 focus:border-transparent focus:shadow-none min-w-0 w-full justify-between";

const FILTER_DATE_TRIGGER = `${FILTER_TRIGGER} [&_span:first-child>svg]:hidden`;

const DELIVERY_OPTIONS = [
  { value: "any", label: "Any Time" },
  { value: "fast", label: "Fast (≤7 days)" },
];

const VISA_TYPE_OPTIONS = [
  { value: "", label: "All Visa Types" },
  { value: "tourist", label: "Tourist" },
  { value: "business", label: "Business" },
  { value: "transit", label: "Transit" },
];

const COMPLEXITY_OPTIONS = [
  { value: "", label: "Any Documents" },
  { value: "simple", label: "Simple (≤3)" },
  { value: "medium", label: "Medium (4–6)" },
  { value: "complex", label: "Complex (7+)" },
];

/**
 * Single filter bar instance — used in the sticky header for both expanded and compact layouts.
 */
export default function CatalogFilters({ compact = false, className }) {
  const {
    visaType,
    setVisaType,
    delivery,
    setDelivery,
    complexity,
    setComplexity,
    travelDate,
    setTravelDate,
    clearFilters,
    hasFilters,
  } = useCatalogSearch();

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
        <SearchableSelect
          data-testid="filter-delivery"
          searchable={false}
          clearable={false}
          value={delivery}
          onChange={(v) => setDelivery(typeof v === "string" ? v : "any")}
          options={DELIVERY_OPTIONS}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
          contentClassName="min-w-[200px]"
        />
      </FilterSection>

      <FilterDivider />

      <FilterSection
        icon={<PlaneTakeoff className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="sky"
        label="Type"
      >
        <SearchableSelect
          data-testid="filter-type"
          searchable={false}
          clearable={false}
          value={visaType}
          onChange={(v) => setVisaType(typeof v === "string" ? v : "")}
          options={VISA_TYPE_OPTIONS}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
          contentClassName="min-w-[200px]"
        />
      </FilterSection>

      <FilterDivider />

      <FilterSection
        icon={<Files className="w-4 h-4" strokeWidth={2.25} />}
        iconTone="amber"
        label="Documents"
      >
        <SearchableSelect
          data-testid="filter-complexity"
          searchable={false}
          clearable={false}
          value={complexity}
          onChange={(v) => setComplexity(typeof v === "string" ? v : "")}
          options={COMPLEXITY_OPTIONS}
          className="w-full min-w-0"
          triggerClassName={FILTER_TRIGGER}
          contentClassName="min-w-[200px]"
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
