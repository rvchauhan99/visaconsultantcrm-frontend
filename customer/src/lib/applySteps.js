/** Build dynamic /apply wizard steps from visa product schema. */

export const DOC_KEY_PASSPORT = "passport_scan"

const STEP_META = {
  traveler: { key: "traveler", label: "Traveler" },
  details: { key: "details", label: "Details" },
  documents: { key: "documents", label: "Documents" },
  review: { key: "review", label: "Review" },
  payment: { key: "payment", label: "Payment" },
}

/**
 * @param {{ fields?: unknown[], documents?: unknown[] } | null | undefined} schema
 * @returns {{ key: string, label: string }[]}
 */
export function buildApplySteps(schema) {
  const steps = [STEP_META.traveler]
  if ((schema?.fields || []).length > 0) steps.push(STEP_META.details)
  if ((schema?.documents || []).length > 0) steps.push(STEP_META.documents)
  steps.push(STEP_META.review, STEP_META.payment)
  return steps
}

export function productRequiresPassport(schema) {
  return (schema?.documents || []).some((d) => d.doc_key === DOC_KEY_PASSPORT)
}

/** Map a saved draft step key onto the current active step list. */
export function resolveDraftStepIndex(stepKey, activeSteps) {
  if (!stepKey || !activeSteps?.length) return 0
  const idx = activeSteps.findIndex((s) => s.key === stepKey)
  if (idx >= 0) return idx
  // e.g. draft on documents but product now has 0 docs → review
  if (stepKey === "documents") {
    const reviewIdx = activeSteps.findIndex((s) => s.key === "review")
    return reviewIdx >= 0 ? reviewIdx : 0
  }
  if (stepKey === "details") {
    const reviewIdx = activeSteps.findIndex((s) => s.key === "review")
    return reviewIdx >= 0 ? reviewIdx : 0
  }
  return 0
}
