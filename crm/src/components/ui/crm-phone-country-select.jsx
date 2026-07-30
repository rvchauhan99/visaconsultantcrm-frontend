import React, { useMemo } from "react";
import { getCountryCallingCode } from "react-phone-number-input";
import { SearchableSelect } from "@/components/forms/AsyncSelect";
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
 * Drop-in countrySelectComponent for react-phone-number-input (CRM density).
 */
export function CrmPhoneCountrySelect({
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
      placeholder="…"
      searchPlaceholder="Search country…"
      emptyText="No match"
      data-testid="crm-phone-country"
      className={cn(
        "crm-phone-country-trigger !h-full !min-h-0 !border-0 !shadow-none !rounded-none !bg-transparent",
        "!px-1 !text-xs w-auto min-w-[3.75rem] max-w-[5.25rem] hover:!border-0 focus:!shadow-none",
      )}
      contentClassName="min-w-[260px]"
      renderValue={(opt) => (
        <span className="inline-flex items-center gap-1">
          {Icon ? <Icon country={opt.value} label={opt.label} /> : null}
          <span className="tabular-nums font-medium">{opt.dial}</span>
        </span>
      )}
      renderOption={(opt) => (
        <span className="inline-flex items-center gap-2 w-full min-w-0">
          {Icon ? (
            <span className="shrink-0 w-4 flex justify-center">
              <Icon country={opt.value} label={opt.label} />
            </span>
          ) : null}
          <span className="truncate flex-1">{opt.label}</span>
          <span className="shrink-0 text-ink-muted tabular-nums">{opt.dial}</span>
        </span>
      )}
    />
  );
}

export default CrmPhoneCountrySelect;
