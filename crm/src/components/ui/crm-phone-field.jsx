import React, { forwardRef, useEffect, useId, useMemo, useState } from "react";
import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PHONE_COUNTRY,
  coercePhoneInput,
  detectPhoneCountry,
  normalizePhoneValue,
} from "@/lib/phone";
import { CrmPhoneCountrySelect } from "@/components/ui/crm-phone-country-select";
import "react-phone-number-input/style.css";
import "./crm-phone-field.css";

const NationalInput = forwardRef(function NationalInput({ className, onPaste, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="tel"
      autoComplete="tel-national"
      onPaste={onPaste}
      className={cn("PhoneInputInput crm-phone-national text-left", className)}
      {...props}
    />
  );
});

/**
 * Compact CRM phone field — country dial + national number.
 * Value: E.164 string or "". Default country: IN.
 * Pasted international numbers are coerced; input shows national digits only.
 */
export const CrmPhoneField = forwardRef(function CrmPhoneField(
  {
    value,
    onChange,
    defaultCountry = DEFAULT_PHONE_COUNTRY,
    disabled,
    className,
    "data-testid": testId,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [country, setCountry] = useState(() =>
    detectPhoneCountry(value || "", defaultCountry),
  );
  const id = useId();

  const displayValue = useMemo(() => {
    if (!value) return undefined;
    const e164 = normalizePhoneValue(value, country || defaultCountry);
    return e164.startsWith("+") ? e164 : undefined;
  }, [value, country, defaultCountry]);

  useEffect(() => {
    if (!value) return;
    const detected = detectPhoneCountry(value, defaultCountry);
    setCountry((prev) => (prev === detected ? prev : detected));
  }, [value, defaultCountry]);

  const applyCoerced = (raw) => {
    const { e164, country: detected } = coercePhoneInput(raw, country || defaultCountry);
    if (detected && detected !== country) setCountry(detected);
    onChange?.(e164.startsWith("+") ? e164 : (raw || ""));
  };

  const handleChange = (next) => {
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
    if (!(trimmed.startsWith("+") || trimmed.startsWith("00") || /[\d\s\-()]{8,}/.test(trimmed))) {
      return;
    }
    event.preventDefault();
    applyCoerced(trimmed);
  };

  return (
    <div
      className={cn(
        "PhoneInput crm-phone",
        focused && "crm-phone--focused",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
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
        numberInputProps={{ "data-testid": testId, onPaste: handlePaste }}
        inputComponent={NationalInput}
        countrySelectComponent={CrmPhoneCountrySelect}
        className="w-full"
      />
    </div>
  );
});

export default CrmPhoneField;
