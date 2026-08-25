/**
 * Visa delivery speed buckets for the customer catalog filter.
 * Buckets (except `any`) are mutually exclusive on processing_time_days.
 */

export const DELIVERY_BUCKETS = [
  {
    value: "any",
    label: "Any Time",
    match: () => true,
  },
  {
    value: "instant",
    label: "Instant",
    match: (days) => days === 0,
  },
  {
    value: "within_24h",
    label: "Within 24 Hours",
    match: (days) => days === 1,
  },
  {
    value: "days_3_5",
    label: "3–5 Days",
    match: (days) => days >= 2 && days <= 5,
  },
  {
    value: "days_6_7",
    label: "6–7 Days",
    match: (days) => days >= 6 && days <= 7,
  },
  {
    value: "days_8_30",
    label: "8–30 Days",
    match: (days) => days >= 8 && days <= 30,
  },
]

const bucketByValue = Object.fromEntries(
  DELIVERY_BUCKETS.map((b) => [b.value, b]),
)

export function getProcessingDays(product) {
  const raw = product?.processing_time_days
  const days = Number(raw)
  return Number.isFinite(days) ? days : null
}

export function matchesDelivery(product, delivery) {
  if (!delivery || delivery === "any") return true
  const bucket = bucketByValue[delivery]
  if (!bucket) return true
  const days = getProcessingDays(product)
  if (days == null) return false
  return bucket.match(days)
}

/**
 * Facet counts for delivery buckets from a product list that already
 * reflects other filters (q, visaType, complexity, travelDate) but not delivery.
 */
export function countDeliveryBuckets(products = []) {
  const list = Array.isArray(products) ? products : []
  const counts = { any: list.length }

  for (const bucket of DELIVERY_BUCKETS) {
    if (bucket.value === "any") continue
    counts[bucket.value] = 0
  }

  for (const product of list) {
    const days = getProcessingDays(product)
    if (days == null) continue
    for (const bucket of DELIVERY_BUCKETS) {
      if (bucket.value === "any") continue
      if (bucket.match(days)) {
        counts[bucket.value] += 1
        break
      }
    }
  }

  return counts
}
