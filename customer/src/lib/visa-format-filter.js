/**
 * Visa issuance (visa_format) buckets for the customer catalog Type filter.
 * Orthogonal to purpose visa_type (tourist/business/…).
 */

export const DEFAULT_VISA_FORMAT = "e_visa"

export const VISA_FORMAT_BUCKETS = [
  {
    value: "any",
    label: "All Visa Types",
    match: () => true,
  },
  {
    value: "visa_free",
    label: "Visa Free",
    match: (fmt) => fmt === "visa_free",
  },
  {
    value: "visa_on_arrival",
    label: "Visa on Arrival",
    match: (fmt) => fmt === "visa_on_arrival",
  },
  {
    value: "e_visa",
    label: "e-Visa",
    match: (fmt) => fmt === "e_visa",
  },
  {
    value: "sticker_visa",
    label: "Sticker Visa",
    match: (fmt) => fmt === "sticker_visa",
  },
]

const bucketByValue = Object.fromEntries(
  VISA_FORMAT_BUCKETS.map((b) => [b.value, b]),
)

export function getVisaFormat(product) {
  const raw = product?.visa_format
  if (raw && bucketByValue[raw]) return raw
  return DEFAULT_VISA_FORMAT
}

export function matchesVisaFormat(product, visaFormat) {
  if (!visaFormat || visaFormat === "any" || visaFormat === "") return true
  const bucket = bucketByValue[visaFormat]
  if (!bucket) return true
  return bucket.match(getVisaFormat(product))
}

/**
 * Facet counts from a product list that already reflects other filters
 * (q, delivery, complexity, travelDate) but not visa_format.
 */
export function countVisaFormatBuckets(products = []) {
  const list = Array.isArray(products) ? products : []
  const counts = { any: list.length }

  for (const bucket of VISA_FORMAT_BUCKETS) {
    if (bucket.value === "any") continue
    counts[bucket.value] = 0
  }

  for (const product of list) {
    const fmt = getVisaFormat(product)
    for (const bucket of VISA_FORMAT_BUCKETS) {
      if (bucket.value === "any") continue
      if (bucket.match(fmt)) {
        counts[bucket.value] += 1
        break
      }
    }
  }

  return counts
}

export function formatVisaFormatLabel(value) {
  const hit = VISA_FORMAT_BUCKETS.find((b) => b.value === value)
  return hit?.label || String(value || "").replace(/_/g, " ")
}

export function formatVisaFormatShort(value) {
  const map = {
    visa_free: "VISA FREE",
    visa_on_arrival: "VOA",
    e_visa: "E-VISA",
    sticker_visa: "STICKER",
  }
  return map[value] || formatVisaFormatLabel(value).toUpperCase()
}
