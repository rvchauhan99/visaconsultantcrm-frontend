import React, { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/AsyncSelect";

const DEFAULT_GET_VALUE = (o) => o?.value ?? o?.id ?? o?.code;
const DEFAULT_GET_LABEL = (o) => o?.label ?? o?.name ?? String(DEFAULT_GET_VALUE(o) ?? "");

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  return String(value).split(",").map((s) => s.trim()).filter(Boolean);
}

function fromArray(arr, valueFormat) {
  if (valueFormat === "array") return arr;
  return arr.join(",");
}

/**
 * MultiSelect — compact popover multi-pick for filters and forms.
 * Accepts comma-separated strings (filters) or string[] (forms).
 */
export function MultiSelect({
  value,
  onChange,
  options = [],
  valueFormat = "csv",
  placeholder = "Any",
  compact = true,
  searchable,
  showChipsInline = false,
  clearable = true,
  disabled = false,
  className = "",
  testId,
  "data-testid": dataTestId,
  getOptionValue = DEFAULT_GET_VALUE,
  getOptionLabel = DEFAULT_GET_LABEL,
  ...rest
}) {
  const resolvedTestId = testId || dataTestId;
  const arrayValue = useMemo(() => toArray(value), [value]);
  const resolvedSearchable = searchable ?? options.length > 6;

  return (
    <SearchableSelect
      multiple
      options={options}
      value={arrayValue}
      onChange={(vals) => onChange?.(fromArray(vals || [], valueFormat), vals)}
      placeholder={placeholder}
      searchable={resolvedSearchable}
      summaryMode={compact ? "compact" : "count"}
      showChipsInline={showChipsInline}
      clearable={clearable}
      disabled={disabled}
      className={className}
      testId={resolvedTestId}
      getOptionValue={getOptionValue}
      getOptionLabel={getOptionLabel}
      {...rest}
    />
  );
}

export default MultiSelect;
