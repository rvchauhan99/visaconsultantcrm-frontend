/** Visa issuance (visa_format) — orthogonal to purpose visa_type. */

export const VISA_FORMAT_OPTIONS = [
  { value: "visa_free", label: "Visa Free" },
  { value: "visa_on_arrival", label: "Visa on Arrival" },
  { value: "e_visa", label: "e-Visa" },
  { value: "sticker_visa", label: "Sticker Visa" },
]

export const DEFAULT_VISA_FORMAT = "e_visa"

export function formatVisaFormatLabel(value) {
  const hit = VISA_FORMAT_OPTIONS.find((o) => o.value === value)
  return hit?.label || (value ? String(value).replace(/_/g, " ") : "—")
}
