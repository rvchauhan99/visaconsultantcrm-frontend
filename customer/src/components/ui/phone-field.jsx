"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHONE_COUNTRY,
  coercePhoneInput,
  detectPhoneCountry,
  normalizePhoneValue,
} from "@/lib/phone";
import { PhoneCountrySelect } from "@/components/ui/phone-country-select";
import "react-phone-number-input/style.css";
import "./phone-field.css";

const NationalInput = forwardRef(function NationalInput(
  { className, onFocus, onBlur, onPaste, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="tel"
      autoComplete="tel-national"
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={onPaste}
      className={cn(
        "PhoneInputInput w-full bg-transparent outline-none font-sans text-sm text-ink",
        "placeholder:text-ink-muted text-left",
        className,
      )}
      {...props}
    />
  );
});

/**
 * Global phone field — country dial code + national number.
 * Value is E.164 string (or ""). Default country: India (IN).
 *
 * variant:
 *  - "float"  — floating label (auth)
 *  - "static" — plain control (wrap with Field, or pass `label`)
 */
export const PhoneField = forwardRef(function PhoneField(
  {
    label,
    hint,
    error,
    required,
    className,
    value,
    onChange,
    defaultCountry = DEFAULT_PHONE_COUNTRY,
    variant = "float",
    disabled,
    "data-testid": testId,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [country, setCountry] = useState(() =>
    detectPhoneCountry(value || "", defaultCountry),
  );
  const id = useId();
  const shellRef = useRef(null);

  const displayValue = useMemo(() => {
    if (!value) return undefined;
    const e164 = normalizePhoneValue(value, country || defaultCountry);
    return e164.startsWith("+") ? e164 : undefined;
  }, [value, country, defaultCountry]);

  // Sync country when external value changes (e.g. profile load)
  useEffect(() => {
    if (!value) return;
    const detected = detectPhoneCountry(value, defaultCountry);
    setCountry((prev) => (prev === detected ? prev : detected));
  }, [value, defaultCountry]);

  // Pin float label to start of national input column
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const countryEl = shell.querySelector(".PhoneInputCountry");
    if (!countryEl || typeof ResizeObserver === "undefined") {
      shell.style.setProperty("--phone-country-width", "5.5rem");
      return undefined;
    }
    const apply = () => {
      const rect = countryEl.getBoundingClientRect();
      shell.style.setProperty("--phone-country-width", `${Math.ceil(rect.width)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(countryEl);
    return () => ro.disconnect();
  }, []);

  const hasValue = Boolean(displayValue) || Boolean(value);
  const lifted = focused || hasValue;

  const applyCoerced = (raw) => {
    const { e164, country: detected } = coercePhoneInput(raw, country || defaultCountry);
    if (detected && detected !== country) setCountry(detected);
    onChange?.(e164.startsWith("+") ? e164 : (raw || ""));
  };

  const handleChange = (next) => {
    // Library emits E.164 when it can parse; undefined while clearing / incomplete
    if (!next) {
      onChange?.("");
      return;
    }
    applyCoerced(next);
  };

  const handlePaste = (event) => {
    const text = event.clipboardData?.getData("text");
    if (!text) return;
    const trimmed = text.trim();
    // Intercept pastes that look like full / international numbers
    if (!(trimmed.startsWith("+") || trimmed.startsWith("00") || /[\d\s\-()]{8,}/.test(trimmed))) {
      return;
    }
    event.preventDefault();
    applyCoerced(trimmed);
  };

  const shellClass = cn(
    "PhoneInput amara-phone",
    "relative flex items-stretch w-full rounded-[14px] border bg-surface-card",
    "transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    focused
      ? "border-navy shadow-[0_0_0_4px_var(--glow-navy)]"
      : error
        ? "border-danger shadow-[0_0_0_3px_rgba(155,61,50,0.12)]"
        : "border-border hover:border-border-strong",
    disabled && "opacity-60 pointer-events-none",
    variant === "float" ? "amara-phone--float" : "amara-phone--static",
  );

  const control = (
    <div ref={shellRef} className={shellClass}>
      <PhoneInput
        id={id}
        ref={ref}
        international={false}
        withCountryCallingCode={false}
        countryCallingCodeEditable={false}
        country={country}
        defaultCountry={defaultCountry}
        onCountryChange={(c) => setCountry(c || defaultCountry)}
        flags={flags}
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        numberInputProps={{
          "data-testid": testId,
          onPaste: handlePaste,
          className: cn(
            "text-left",
            variant === "float" && label
              ? lifted
                ? "pt-5 pb-2"
                : "py-3.5"
              : "py-3",
          ),
        }}
        inputComponent={NationalInput}
        countrySelectComponent={PhoneCountrySelect}
        className="w-full"
      />

      {variant === "float" && label && (
        <label
          htmlFor={id}
          className={cn(
            "amara-phone-float-label absolute pointer-events-none font-sans z-[1] text-left",
            "transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            lifted
              ? "top-2 text-[11px] font-semibold tracking-wide text-navy"
              : "top-1/2 -translate-y-1/2 text-sm text-ink-muted",
          )}
        >
          {label}
          {required ? " *" : ""}
        </label>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-1.5 amara-phone-field", className)}>
      {variant === "static" && label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink leading-none text-left">
          {label}
          {required && <span className="ml-1 text-danger text-xs">*</span>}
        </label>
      )}

      {control}

      {error && (
        <p className="text-xs text-danger flex items-center gap-1 pl-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-ink-muted pl-1 text-left">{hint}</p>}
    </div>
  );
});

export default PhoneField;
