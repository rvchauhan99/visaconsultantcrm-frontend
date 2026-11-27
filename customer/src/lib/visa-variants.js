/** Helpers for opt-in multi-validity / multi-price visa SKUs. */

import { computeFeeBreakdown } from "@/lib/productPricing";

export function activeVariants(product) {
  const rows = product?.variants || [];
  return rows.filter((v) => (v.status || "active") === "active");
}

export function isMultiSku(product) {
  return activeVariants(product).length > 1;
}

export function variantGroupKey(v) {
  return `${v.validity_days}|${v.entry_type || "multiple"}|${v.max_stay_days ?? ""}`;
}

/** Group active variants by validity/entry/max-stay for Atlys-style cards. */
export function groupVariantsByValidity(variants) {
  const map = new Map();
  for (const v of variants) {
    const key = variantGroupKey(v);
    if (!map.has(key)) {
      map.set(key, {
        key,
        validity_days: v.validity_days,
        max_stay_days: v.max_stay_days,
        entry_type: v.entry_type || "multiple",
        label: v.label,
        options: [],
      });
    }
    map.get(key).options.push(v);
  }
  return Array.from(map.values()).map((g) => {
    g.options.sort((a, b) => (a.processing_time_days || 0) - (b.processing_time_days || 0));
    // Prefer shortest label without "(Express)" for group title
    const base = g.options.find((o) => !/express/i.test(o.label || "")) || g.options[0];
    g.label = base?.label || g.label;
    return g;
  });
}

export function variantUnitTotal(variant) {
  return computeFeeBreakdown({
    govtFee: variant?.fees?.govt_fee,
    serviceFee: variant?.fees?.service_fee,
  }).total;
}

export function pricePerYearLabel(variant) {
  const days = Number(variant?.validity_days || 0);
  if (days < 365) return null;
  const years = Math.max(1, Math.round(days / 365));
  const total = variantUnitTotal(variant);
  if (!total) return null;
  return Math.round(total / years);
}

export function entryTypeLabel(entry) {
  const e = (entry || "multiple").toLowerCase();
  if (e === "single") return "Single";
  if (e === "double") return "Double";
  return "Multiple";
}
