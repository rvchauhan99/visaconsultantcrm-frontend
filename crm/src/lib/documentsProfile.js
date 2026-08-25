/** Catalog Documents filter profile — mirrors backend utils/documents_profile.py */

export const DOC_KEY_PASSPORT = "passport_scan"
export const DOC_KEY_BANK = "bank_statement"
export const DOC_KEY_ITR = "itr"
export const DOC_KEY_PRIOR_VISA = "prior_visa_us_uk_schengen"
const ONLY_PASSPORT_ALLOWED = new Set(["photo", DOC_KEY_PASSPORT])

export const DOCUMENTS_PROFILE_LABELS = {
  only_passport: "Only Passport",
  passport_bank: "Passport & Bank Statements",
  passport_bank_itr: "Passport, Bank Statements & Income Tax Return",
  prior_visa: "With US/UK/Schengen visa",
}

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

export function formatDocumentsProfileLabel(profile) {
  if (!profile) return "Any Documents only (no specific bucket)"
  return DOCUMENTS_PROFILE_LABELS[profile] || String(profile).replace(/_/g, " ")
}

/** From ProductBuilder schema.documents (required rows only). */
export function profileFromSchemaDocuments(documents = []) {
  const keys = (Array.isArray(documents) ? documents : [])
    .filter((d) => d?.required)
    .map((d) => d.doc_key)
    .filter(Boolean)
  return classifyDocumentsProfile(keys)
}
