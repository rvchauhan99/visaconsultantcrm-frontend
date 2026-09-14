import { buildApplySteps, productRequiresPassport, resolveDraftStepIndex } from "../src/lib/applySteps.js"

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed")
}

assert(buildApplySteps({ fields: [], documents: [] }).map((s) => s.key).join(",") === "traveler,review,payment")
assert(
  buildApplySteps({ fields: [{ field_key: "a" }], documents: [] }).map((s) => s.key).join(",") ===
    "traveler,details,review,payment"
)
assert(
  buildApplySteps({
    fields: [],
    documents: [{ doc_key: "passport_scan" }],
  })
    .map((s) => s.key)
    .join(",") === "traveler,documents,review,payment"
)
assert(productRequiresPassport({ documents: [{ doc_key: "passport_scan" }] }) === true)
assert(productRequiresPassport({ documents: [{ doc_key: "photo" }] }) === false)
assert(resolveDraftStepIndex("documents", buildApplySteps({ documents: [] })) === 1) // review
console.log("applySteps ok")
