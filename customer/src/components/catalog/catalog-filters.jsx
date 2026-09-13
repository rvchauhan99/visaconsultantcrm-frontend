"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarHeart,
  ChevronDown,
  Files,
  PlaneTakeoff,
  Rocket,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar } from "@/components/ui/calendar";
import { DeliveryFilterSelect } from "@/components/catalog/delivery-filter-select";
import { VisaFormatFilterSelect } from "@/components/catalog/visa-format-filter-select";
import { DocumentsProfileFilterSelect } from "@/components/catalog/documents-profile-filter-select";
import { useCatalogSearch } from "@/context/catalog-search";
import { useVisaProducts } from "@/hooks/customer-api";
import {
  DELIVERY_BUCKETS,
  countDeliveryBuckets,
  matchesDelivery,
} from "@/lib/delivery-filter";
import {
  VISA_FORMAT_BUCKETS,
  countVisaFormatBuckets,
  matchesVisaFormat,
} from "@/lib/visa-format-filter";
import {
  DOCUMENTS_PROFILE_BUCKETS,
  countDocumentsProfileBuckets,
  matchesDocumentsProfile,
} from "@/lib/documents-profile-filter";
import { cn } from "@/lib/utils";

const FILTER_TRIGGER =
  "border-0 bg-transparent shadow-none px-0 py-0 rounded-none font-semibold text-sm hover:border-0 focus:border-transparent focus:shadow-none min-w-0 w-full justify-between";

const FILTER_DATE_TRIGGER = `${FILTER_TRIGGER} [&_span:first-child>svg]:hidden`;

function toDate(value) {
  if (value == null || value === "") return undefined;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : undefined;
}

function toIso(date) {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Single filter bar instance:
 * - On desktop (lg+): Preserves the horizontal filter bar pill with popovers.
 * - On mobile (< lg): Shows only a compact Filter button, which portals a full-screen
 *   overlay and bottom-sheet above all page content (preventing parent clip/backdrop issues).
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile bottom-sheet state (initially closed on mobile)
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Accordion state inside the mobile sheet (initially all sections collapsed)
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (sectionKey) => {
    setExpandedSection((curr) => (curr === sectionKey ? null : sectionKey));
  };

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (!isPanelOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPanelOpen]);

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

  const deliveryLabel = useMemo(() => {
    return (
      DELIVERY_BUCKETS.find((b) => b.value === delivery)?.label || "Any Time"
    );
  }, [delivery]);

  const visaFormatLabel = useMemo(() => {
    return (
      VISA_FORMAT_BUCKETS.find((b) => b.value === visaFormat)?.label ||
      "All Visa Types"
    );
  }, [visaFormat]);

  const documentsLabel = useMemo(() => {
    return (
      DOCUMENTS_PROFILE_BUCKETS.find((b) => b.value === documentsProfile)
        ?.label || "Any Documents"
    );
  }, [documentsProfile]);

  const holidaysLabel = useMemo(() => {
    if (!travelDate) return "Select Dates";
    const d = toDate(travelDate);
    return d ? format(d, "dd MMM yyyy") : "Select Dates";
  }, [travelDate]);

  const visibleDocBuckets = useMemo(() => {
    return DOCUMENTS_PROFILE_BUCKETS.filter((bucket) => {
      if (bucket.value === "any") return true;
      if (bucket.value === documentsProfile) return true;
      return (documentsProfileCounts[bucket.value] ?? 0) > 0;
    });
  }, [documentsProfileCounts, documentsProfile]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (delivery && delivery !== "any") count += 1;
    if (visaFormat && visaFormat !== "any") count += 1;
    if (documentsProfile && documentsProfile !== "any") count += 1;
    if (travelDate) count += 1;
    return count;
  }, [delivery, visaFormat, documentsProfile, travelDate]);

  const activeFilterSummary = useMemo(() => {
    const parts = [
      delivery !== "any" ? deliveryLabel : null,
      visaFormat !== "any" ? visaFormatLabel : null,
      documentsProfile !== "any" ? documentsLabel : null,
      travelDate ? holidaysLabel : null,
    ].filter(Boolean);
    return parts.join(", ");
  }, [
    delivery,
    deliveryLabel,
    visaFormat,
    visaFormatLabel,
    documentsProfile,
    documentsLabel,
    travelDate,
    holidaysLabel,
  ]);

  return (
    <>
      {/* DESKTOP FILTER BAR: Preserved EXACTLY for lg breakpoint and above */}
      <div
        className={cn(
          "hidden lg:flex atlys-filter-bar",
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
            onChange={(v) =>
              setDocumentsProfile(typeof v === "string" ? v : "any")
            }
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

      {/* MOBILE COMPACT FILTER TRIGGER BUTTON: Minimal vertical space, visible only on < lg */}
      <div className="block lg:hidden w-full max-w-lg mx-auto">
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className={cn(
            "flex items-center justify-between w-full py-2 px-3.5 rounded-full border border-black/10 bg-white shadow-xs",
            "hover:border-black/25 active:scale-[0.99] transition-all text-ink",
          )}
          data-testid="mobile-filter-trigger"
          aria-label="Open visa filters"
          aria-expanded={isPanelOpen}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/5 text-navy shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />
            </span>
            <span className="text-sm font-semibold truncate text-ink">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-navy text-white text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-muted shrink-0 ml-2">
            {activeFilterCount > 0 ? (
              <span className="font-medium text-teal truncate max-w-[150px]">
                {activeFilterSummary}
              </span>
            ) : (
              <span>All visas</span>
            )}
            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
          </div>
        </button>
      </div>

      {/* MOBILE BOTTOM-SHEET / MODAL PANEL: Rendered via Portal to document.body
          This ensures the panel is completely outside header/clipping contexts,
          sits at z-[9999], completely covers visa cards with solid white background,
          and takes full viewport height. */}
      {mounted &&
        isPanelOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-sheet-title"
            data-testid="mobile-filter-sheet"
          >
            {/* Dark semi-transparent backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
              onClick={() => setIsPanelOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Container: Solid white, elevated, properly positioned */}
            <div
              className={cn(
                "relative z-10 w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col rounded-t-[28px] bg-white",
                "shadow-[0_-16px_48px_rgba(0,0,0,0.28)] border-t border-black/10 overflow-hidden",
                "slide-in-from-bottom",
              )}
              style={{ backgroundColor: "#ffffff" }}
              data-testid="mobile-filter-panel"
            >
              {/* Pull handle indicator */}
              <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Sheet Header: Title, Active badge & Close Button */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08] bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <h2
                    id="mobile-filter-sheet-title"
                    className="text-base sm:text-lg font-bold text-ink"
                  >
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-navy text-white text-[11px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 -mr-1 rounded-full hover:bg-black/5 text-ink-muted hover:text-ink transition-colors"
                  data-testid="mobile-filter-close"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sheet Scrollable Body: 4 Accordion Sections */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 overscroll-contain bg-white mobile-filter-sections"
                style={{ backgroundColor: "#ffffff" }}
              >
                {/* Section 1: Visa delivery */}
                <MobileFilterAccordionSection
                  key="delivery"
                  sectionKey="delivery"
                  icon={<Rocket className="w-4 h-4" strokeWidth={2.25} />}
                  iconTone="emerald"
                  label="Visa delivery"
                  valueText={deliveryLabel}
                  isOpen={expandedSection === "delivery"}
                  onToggle={() => toggleSection("delivery")}
                  testId="mobile-filter-delivery"
                >
                  <div
                    className="flex flex-col gap-1 py-1 px-0.5"
                    role="listbox"
                    aria-label="Visa delivery options"
                  >
                    {DELIVERY_BUCKETS.map((bucket) => {
                      const isSelected = bucket.value === delivery;
                      const count = deliveryCounts[bucket.value] ?? 0;
                      return (
                        <button
                          key={bucket.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`mobile-delivery-opt-${bucket.value}`}
                          onClick={() => setDelivery(bucket.value)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors min-h-[40px]",
                            isSelected
                              ? "bg-navy/[0.08] text-navy font-semibold"
                              : "text-ink hover:bg-black/[0.03]",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full transition-all",
                              isSelected
                                ? "bg-navy ring-2 ring-navy/20"
                                : "bg-transparent border border-black/25",
                            )}
                          />
                          <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                            <span className="text-sm truncate">{bucket.label}</span>
                            <span
                              className="text-ink-muted text-xs shrink-0"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="text-ink-muted text-xs tabular-nums shrink-0">
                              {count}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </MobileFilterAccordionSection>

                {/* Section 2: Type */}
                <MobileFilterAccordionSection
                  key="type"
                  sectionKey="type"
                  icon={<PlaneTakeoff className="w-4 h-4" strokeWidth={2.25} />}
                  iconTone="sky"
                  label="Type"
                  valueText={visaFormatLabel}
                  isOpen={expandedSection === "type"}
                  onToggle={() => toggleSection("type")}
                  testId="mobile-filter-type"
                >
                  <div
                    className="flex flex-col gap-1 py-1 px-0.5"
                    role="listbox"
                    aria-label="Visa type options"
                  >
                    {VISA_FORMAT_BUCKETS.map((bucket) => {
                      const isSelected = bucket.value === visaFormat;
                      const count = visaFormatCounts[bucket.value] ?? 0;
                      return (
                        <button
                          key={bucket.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`mobile-type-opt-${bucket.value}`}
                          onClick={() => setVisaFormat(bucket.value)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors min-h-[40px]",
                            isSelected
                              ? "bg-navy/[0.08] text-navy font-semibold"
                              : "text-ink hover:bg-black/[0.03]",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full transition-all",
                              isSelected
                                ? "bg-navy ring-2 ring-navy/20"
                                : "bg-transparent border border-black/25",
                            )}
                          />
                          <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                            <span className="text-sm truncate">{bucket.label}</span>
                            <span
                              className="text-ink-muted text-xs shrink-0"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="text-ink-muted text-xs tabular-nums shrink-0">
                              {count}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </MobileFilterAccordionSection>

                {/* Section 3: Documents */}
                <MobileFilterAccordionSection
                  key="documents"
                  sectionKey="documents"
                  icon={<Files className="w-4 h-4" strokeWidth={2.25} />}
                  iconTone="amber"
                  label="Documents"
                  valueText={documentsLabel}
                  isOpen={expandedSection === "documents"}
                  onToggle={() => toggleSection("documents")}
                  testId="mobile-filter-documents"
                >
                  <div
                    className="flex flex-col gap-1 py-1 px-0.5"
                    role="listbox"
                    aria-label="Document options"
                  >
                    {visibleDocBuckets.map((bucket) => {
                      const isSelected = bucket.value === documentsProfile;
                      const count = documentsProfileCounts[bucket.value] ?? 0;
                      return (
                        <button
                          key={bucket.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`mobile-documents-opt-${bucket.value}`}
                          onClick={() => setDocumentsProfile(bucket.value)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors min-h-[40px]",
                            isSelected
                              ? "bg-navy/[0.08] text-navy font-semibold"
                              : "text-ink hover:bg-black/[0.03]",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full transition-all",
                              isSelected
                                ? "bg-navy ring-2 ring-navy/20"
                                : "bg-transparent border border-black/25",
                            )}
                          />
                          <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                            <span className="text-sm truncate">{bucket.label}</span>
                            <span
                              className="text-ink-muted text-xs shrink-0"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="text-ink-muted text-xs tabular-nums shrink-0">
                              {count}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </MobileFilterAccordionSection>

                {/* Section 4: Holidays */}
                <MobileFilterAccordionSection
                  key="holidays"
                  sectionKey="holidays"
                  icon={<CalendarHeart className="w-4 h-4" strokeWidth={2.25} />}
                  iconTone="rose"
                  label="Holidays"
                  valueText={holidaysLabel}
                  isOpen={expandedSection === "holidays"}
                  onToggle={() => toggleSection("holidays")}
                  testId="mobile-filter-holidays"
                >
                  <div className="flex flex-col items-center py-2 px-1">
                    <Calendar
                      mode="single"
                      selected={toDate(travelDate)}
                      onSelect={(day) => {
                        setTravelDate(toIso(day));
                      }}
                      defaultMonth={toDate(travelDate) || new Date()}
                      captionLayout="dropdown"
                      className="mx-auto"
                    />
                    {travelDate && (
                      <button
                        type="button"
                        onClick={() => setTravelDate("")}
                        className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors py-1 px-3 rounded-full hover:bg-rose-50"
                        data-testid="mobile-clear-date"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                </MobileFilterAccordionSection>
              </div>

              {/* Sheet Footer: Clear Filters and Apply buttons */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/[0.08] bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-ink-muted hover:text-ink transition-colors py-2 px-3 rounded-full hover:bg-black/[0.04]"
                  data-testid="mobile-clear-filters"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedSection(null);
                    setIsPanelOpen(false);
                  }}
                  className="text-sm font-semibold text-white bg-navy hover:bg-navy-hover transition-all py-2.5 px-6 rounded-full shadow-sm active:scale-95"
                  data-testid="mobile-apply-filters"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

const ICON_TONES = {
  emerald: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/15",
  sky: "bg-sky-500/12 text-sky-600 ring-sky-500/15",
  amber: "bg-amber-500/12 text-amber-600 ring-amber-500/15",
  rose: "bg-rose-500/12 text-rose-500 ring-rose-500/15",
};

function MobileFilterAccordionSection({
  icon,
  iconTone = "emerald",
  label,
  valueText,
  isOpen,
  onToggle,
  testId,
  children,
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden bg-white",
        isOpen
          ? "border-navy/40 shadow-xs ring-1 ring-navy/10"
          : "border-border/80 hover:border-border-strong",
      )}
      style={{ backgroundColor: "#ffffff" }}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/[0.02] min-h-[52px]"
        aria-expanded={isOpen}
        data-testid={`${testId}-trigger`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full ring-1 shrink-0",
              ICON_TONES[iconTone],
            )}
          >
            {icon}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium text-ink-muted leading-tight">
              {label}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-ink truncate leading-snug">
              {valueText}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-ink-muted shrink-0 transition-transform duration-200 ml-2",
            isOpen && "rotate-180 text-navy",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="border-t border-border/50 px-2 py-2 bg-surface-muted/30">
          {children}
        </div>
      )}
    </div>
  );
}

function FilterSection({
  icon,
  iconTone = "emerald",
  label,
  children,
  testid,
}) {
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
  return (
    <div className="atlys-filter-divider w-px self-stretch min-h-[2.5rem] bg-border/70 shrink-0" />
  );
}
