import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY = "IN";

/**
 * Normalize a stored or typed phone to E.164.
 * Bare digits without "+" are parsed as `defaultCountry` (India by default).
 * Returns "" for empty input; returns trimmed raw string if unparseable.
 */
export function normalizePhoneValue(raw, defaultCountry = DEFAULT_PHONE_COUNTRY) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  try {
    const parsed = parsePhoneNumberFromString(s, defaultCountry);
    if (parsed) return parsed.format("E.164");
  } catch {
    /* fall through */
  }
  return s;
}

/**
 * Smart coerce for paste/type that may include a country calling code.
 * Returns { e164, country } — country is ISO2 when parse succeeds, else null.
 */
export function coercePhoneInput(raw, defaultCountry = DEFAULT_PHONE_COUNTRY) {
  if (raw == null) return { e164: "", country: null };
  let s = String(raw).trim();
  if (!s) return { e164: "", country: null };

  // Common paste forms: 00CC… → +CC…
  if (s.startsWith("00")) s = `+${s.slice(2)}`;

  try {
    const parsed = parsePhoneNumberFromString(s, defaultCountry);
    if (parsed) {
      return {
        e164: parsed.format("E.164"),
        country: parsed.country || defaultCountry,
      };
    }
  } catch {
    /* fall through */
  }

  return { e164: s, country: null };
}

/** Infer ISO country from an existing E.164 (or national) value. */
export function detectPhoneCountry(raw, defaultCountry = DEFAULT_PHONE_COUNTRY) {
  const { country } = coercePhoneInput(raw, defaultCountry);
  return country || defaultCountry;
}

/** True when value is a valid international number (libphonenumber). */
export function isValidPhone(value) {
  if (value == null || !String(value).trim()) return false;
  try {
    return isValidPhoneNumber(String(value).trim());
  } catch {
    return false;
  }
}

/** Optional phone: empty OK; non-empty must be valid. */
export function isValidPhoneOptional(value) {
  if (value == null || !String(value).trim()) return true;
  return isValidPhone(value);
}

export function formatPhoneDisplay(value, defaultCountry = DEFAULT_PHONE_COUNTRY) {
  if (!value) return "";
  try {
    const parsed = parsePhoneNumberFromString(String(value).trim(), defaultCountry);
    if (parsed) return parsed.formatInternational();
  } catch {
    /* fall through */
  }
  return String(value);
}
