/**
 * Indian ordinary passport issue ↔ expiry helpers.
 * expiry = issue + N years − 1 day
 * issue  = expiry − N years + 1 day
 * N = 10 if adult (≥18) at issue, else 5.
 */

function parseIso(value) {
  if (!value || typeof value !== "string") return null
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function addYears(d, years) {
  const next = new Date(d.getTime())
  const month = next.getMonth()
  const day = next.getDate()
  next.setFullYear(next.getFullYear() + years)
  // Leap-safe: Feb 29 → Feb 28 on non-leap target
  if (month === 1 && day === 29 && next.getMonth() !== 1) {
    next.setMonth(1, 28)
  }
  return next
}

export function ageOn(dob, onDate) {
  let years = onDate.getFullYear() - dob.getFullYear()
  if (
    onDate.getMonth() < dob.getMonth() ||
    (onDate.getMonth() === dob.getMonth() && onDate.getDate() < dob.getDate())
  ) {
    years -= 1
  }
  return years
}

export function indianValidityYears(dob, issue) {
  return ageOn(dob, issue) >= 18 ? 10 : 5
}

export function expiryFromIssue(issueIso, dobIso) {
  const issue = parseIso(issueIso)
  const dob = parseIso(dobIso)
  if (!issue) return null
  const years = dob ? indianValidityYears(dob, issue) : 10
  const expiry = addYears(issue, years)
  expiry.setDate(expiry.getDate() - 1)
  return toIso(expiry)
}

export function issueFromExpiry(expiryIso, dobIso) {
  const expiry = parseIso(expiryIso)
  const dob = parseIso(dobIso)
  if (!expiry) return null
  const candidate10 = addYears(expiry, -10)
  candidate10.setDate(candidate10.getDate() + 1)
  let issue = candidate10
  if (dob && ageOn(dob, candidate10) < 18) {
    issue = addYears(expiry, -5)
    issue.setDate(issue.getDate() + 1)
  }
  if (dob && issue < dob) return null
  return toIso(issue)
}
