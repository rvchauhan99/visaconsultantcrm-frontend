/**
 * Documents catalog buckets — derived from required product doc_keys / documents_profile.
 * Photo is ignored; classification matches backend utils/documents_profile.py.
 */

export const DOC_KEY_PASSPORT = "passport_scan"
export const DOC_KEY_BANK = "bank_statement"
export const DOC_KEY_ITR = "itr"
export const DOC_KEY_PRIOR_VISA = "prior_visa_us_uk_schengen"
const ONLY_PASSPORT_ALLOWED = new Set(["photo", DOC_KEY_PASSPORT])

export const DOCUMENTS_PROFILE_BUCKETS = [
  { value: "any", label: "Any Documents" },
  { value: "only_passport", label: "Only Passport" },
  { value: "passport_bank", label: "Passport & Bank Statements" },
  {
    value: "passport_bank_itr",
    label: "Passport, Bank Statements & Income Tax Return",
  },
  { value: "prior_visa", label: "With US/UK/Schengen visa" },
]

export function classifyDocumentsProfile(requiredKeys = []) {
  const keys = new Set(Array.isArray(requiredKeys) ? requiredKeys : [])

  if (keys.has(DOC_KEY_PRIOR_VISA)) return "prior_visa"
  if (keys.has(DOC_KEY_PASSPORT) && keys.has(DOC_KEY_BANK) && keys.has(DOC_KEY_ITR)) {
    return "passport_bank_itr"
  }
  if (keys.has(DOC_KEY_PASSPORT) && keys.has(DOC_KEY_BANK) && !keys.has(DOC_KEY_ITR)) {
    return "passport_bank"
  }
  if (keys.has(DOC_KEY_PASSPORT) && [...keys].every((k) => ONLY_PASSPORT_ALLOWED.has(k))) {
    return "only_passport"
  }
  return null
}

export function getDocumentsProfile(product) {
  if (product?.documents_profile) return product.documents_profile
  return classifyDocumentsProfile(product?.required_doc_keys || [])
}

export function matchesDocumentsProfile(product, documentsProfile) {
  if (!documentsProfile || documentsProfile === "any" || documentsProfile === "") {
    return true
  }
  return getDocumentsProfile(product) === documentsProfile
}

export function countDocumentsProfileBuckets(products = []) {
  const list = Array.isArray(products) ? products : []
  const counts = { any: list.length }

  for (const bucket of DOCUMENTS_PROFILE_BUCKETS) {
    if (bucket.value === "any") continue
    counts[bucket.value] = 0
  }

  for (const product of list) {
    const profile = getDocumentsProfile(product)
    if (profile && counts[profile] != null) {
      counts[profile] += 1
    }
  }

  return counts
}

export function formatDocumentsProfileLabel(profile) {
  const hit = DOCUMENTS_PROFILE_BUCKETS.find((b) => b.value === profile)
  return hit?.label || (profile ? String(profile).replace(/_/g, " ") : "—")
}
