"use client";

import { useMemo } from "react";
import { getCountryCallingCode } from "react-phone-number-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

function dialCode(country) {
  if (!country || country === "ZZ") return "";
  try {
    return `+${getCountryCallingCode(country)}`;
  } catch {
    return "";
  }
}

/**
 * Drop-in countrySelectComponent for react-phone-number-input.
 * Searchable list with flag + name + dial code; no "International" (ZZ).
 */
export function PhoneCountrySelect({
  value,
  onChange,
  options = [],
  iconComponent: Icon,
  disabled,
  readOnly,
}) {
  const mapped = useMemo(
    () =>
      (options || [])
        .filter((o) => o.value && o.value !== "ZZ")
        .map((o) => {
          const dial = dialCode(o.value);
          return {
            value: o.value,
            label: o.label,
            dial,
            searchText: `${o.label} ${o.value} ${dial}`,
          };
        }),
    [options],
  );

  return (
    <SearchableSelect
      options={mapped}
      value={value || null}
      onChange={(v) => onChange?.(v || undefined)}
      disabled={disabled || readOnly}
      clearable={false}
      placeholder="Country"
      searchPlaceholder="Search country or code…"
      emptyText="No countries match"
      data-testid="phone-country-select"
      triggerClassName={cn(
        "amara-phone-country-trigger !rounded-none !border-0 !shadow-none !px-2 !py-0",
        "!bg-transparent hover:!border-0 focus:!shadow-none h-full min-h-[2.75rem]",
        "w-auto min-w-[4.5rem] max-w-[6.5rem]",
      )}
      contentClassName="min-w-[280px]"
      renderValue={(opt) => (
        <span className="inline-flex items-center gap-1.5">
          {Icon ? <Icon country={opt.value} label={opt.label} /> : null}
          <span className="font-sans text-sm font-medium text-ink tabular-nums">{opt.dial}</span>
        </span>
      )}
      renderOption={(opt) => (
        <span className="inline-flex items-center gap-2 w-full min-w-0">
          {Icon ? (
            <span className="shrink-0 w-5 flex justify-center">
              <Icon country={opt.value} label={opt.label} />
            </span>
          ) : null}
          <span className="truncate flex-1">{opt.label}</span>
          <span className="shrink-0 text-ink-muted tabular-nums text-xs">{opt.dial}</span>
        </span>
      )}
    />
  );
}

export default PhoneCountrySelect;
